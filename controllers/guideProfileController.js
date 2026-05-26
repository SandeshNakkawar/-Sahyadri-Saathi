const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const GuideProfile = require('../models/guideProfileModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ─── Document Upload Setup (Private Directory) ──────────────────
const documentStorage = multer.memoryStorage();

const documentFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only images (JPEG/PNG) and PDF files are allowed for documents.', 400), false);
  }
};

const uploadDocuments = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for documents
});

// Profile photo upload (public)
const photoStorage = multer.memoryStorage();
const photoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: photoFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

exports.uploadProfilePhoto = uploadPhoto.single('profilePhoto');
exports.uploadVerificationDocs = uploadDocuments.fields([
  { name: 'idProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 },
  { name: 'certificate', maxCount: 1 }
]);

// Process and save profile photo
exports.resizeProfilePhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const guidesDir = path.join(__dirname, '..', 'public', 'img', 'guides');
  await fs.promises.mkdir(guidesDir, { recursive: true });

  const filename = `guide-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(path.join(guidesDir, filename));

  req.body.profilePhoto = filename;
  next();
});

// Save verification documents to private directory
exports.saveVerificationDocs = catchAsync(async (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) return next();

  const docsDir = path.join(__dirname, '..', 'private', 'uploads', 'guide-documents');
  await fs.promises.mkdir(docsDir, { recursive: true });

  const documents = {};

  for (const fieldName of ['idProof', 'addressProof', 'certificate']) {
    if (req.files[fieldName] && req.files[fieldName][0]) {
      const file = req.files[fieldName][0];
      const ext = file.mimetype === 'application/pdf' ? 'pdf' : 'jpeg';
      const filename = `${fieldName}-${req.user.id}-${Date.now()}.${ext}`;

      if (ext === 'pdf') {
        await fs.promises.writeFile(path.join(docsDir, filename), file.buffer);
      } else {
        await sharp(file.buffer)
          .resize(1200, 1200, { fit: 'inside' })
          .toFormat('jpeg')
          .jpeg({ quality: 85 })
          .toFile(path.join(docsDir, filename));
      }

      documents[fieldName] = filename;
    }
  }

  if (!req.body.documents) req.body.documents = {};
  Object.assign(req.body.documents, documents);
  req.skipResponse = true;
  next();
});

// ─── Get My Profile (Guide) ─────────────────────────────────────
exports.getMyProfile = catchAsync(async (req, res, next) => {
  let profile = await GuideProfile.findOne({ user: req.user.id })
    .populate({
      path: 'serviceLocations',
      select: 'name slug category city'
    });

  if (!profile) {
    // Return empty profile for onboarding
    return res.status(200).json({
      status: 'success',
      data: { profile: null, onboardingRequired: true }
    });
  }

  res.status(200).json({
    status: 'success',
    data: { profile }
  });
});

// ─── Create / Update Profile (Guide Onboarding) ─────────────────
exports.createOrUpdateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = [
    'displayName', 'bio', 'profilePhoto', 'baseCity',
    'serviceLocations', 'languages', 'specialties',
    'experienceYears', 'pricePerDay', 'halfDayPrice',
    'maxGroupSize', 'availability', 'travelRadiusKm',
    'documents',
    'pricingRules', 'advanceBookingDiscount', 'weekendSurchargePercent'
  ];

  // Parse JSON-stringified pricing fields from FormData
  if (typeof req.body.pricingRules === 'string') {
    try { req.body.pricingRules = JSON.parse(req.body.pricingRules); } catch (e) { /* ignore */ }
  }
  if (typeof req.body.advanceBookingDiscount === 'string') {
    try { req.body.advanceBookingDiscount = JSON.parse(req.body.advanceBookingDiscount); } catch (e) { /* ignore */ }
  }
  if (typeof req.body.weekendSurchargePercent === 'string') {
    req.body.weekendSurchargePercent = parseInt(req.body.weekendSurchargePercent, 10) || 0;
  }

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  let profile = await GuideProfile.findOne({ user: req.user.id });

  if (profile) {
    // Update existing
    Object.assign(profile, updates);
    await profile.save();
  } else {
    // Create new
    profile = await GuideProfile.create({
      user: req.user.id,
      ...updates
    });
  }

  // Re-populate for response
  profile = await GuideProfile.findById(profile._id).populate({
    path: 'serviceLocations',
    select: 'name slug category city'
  });

  if (req.skipResponse) {
    return next();
  }

  res.status(200).json({
    status: 'success',
    data: { profile }
  });
});

// ─── Submit for Verification ─────────────────────────────────────
exports.submitVerification = catchAsync(async (req, res, next) => {
  const profile = await GuideProfile.findOne({ user: req.user.id });

  if (!profile) {
    return next(new AppError('Please complete your profile first.', 400));
  }

  // Validate required fields for submission
  if (!profile.displayName || !profile.baseCity) {
    return next(new AppError('Please complete your basic profile before submitting.', 400));
  }

  if (!profile.documents || !profile.documents.idProof) {
    return next(new AppError('Please upload at least your ID proof before submitting.', 400));
  }

  if (!profile.pricePerDay) {
    return next(new AppError('Please set your pricing before submitting.', 400));
  }

  if (profile.verificationStatus === 'pending_review') {
    return next(new AppError('Your verification is already under review.', 400));
  }

  if (profile.verificationStatus === 'approved') {
    return next(new AppError('You are already verified.', 400));
  }

  profile.verificationStatus = 'pending_review';
  profile.rejectionReason = undefined;
  await profile.save();

  res.status(200).json({
    status: 'success',
    message: 'Your profile has been submitted for verification.',
    data: { profile }
  });
});

// ─── Get Public Guides (Approved Only) ───────────────────────────
exports.getPublicGuides = catchAsync(async (req, res, next) => {
  const filter = {
    verificationStatus: 'approved',
    isPublic: true
  };

  // Filter by place
  if (req.query.place) {
    filter.serviceLocations = req.query.place;
  }

  // Filter by language
  if (req.query.language) {
    filter.languages = { $in: req.query.language.split(',') };
  }

  // Filter by specialty
  if (req.query.specialty) {
    filter.specialties = { $in: req.query.specialty.split(',') };
  }

  // Filter by price range
  if (req.query.minPrice || req.query.maxPrice) {
    filter.pricePerDay = {};
    if (req.query.minPrice) filter.pricePerDay.$gte = parseInt(req.query.minPrice, 10);
    if (req.query.maxPrice) filter.pricePerDay.$lte = parseInt(req.query.maxPrice, 10);
  }

  // Filter by rating
  if (req.query.minRating) {
    filter.ratingsAverage = { $gte: parseFloat(req.query.minRating) };
  }

  // Sort
  let sort = '-ratingsAverage';
  if (req.query.sort) sort = req.query.sort;

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const guides = await GuideProfile.find(filter)
    .populate({
      path: 'serviceLocations',
      select: 'name slug category'
    })
    .sort(sort)
    .skip(skip)
    .limit(limit);

  const total = await GuideProfile.countDocuments(filter);

  res.status(200).json({
    status: 'success',
    results: guides.length,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: { guides }
  });
});

// ─── Get Guide by ID (Public, Approved Only) ─────────────────────
exports.getGuideById = catchAsync(async (req, res, next) => {
  const guide = await GuideProfile.findOne({
    _id: req.params.id,
    verificationStatus: 'approved',
    isPublic: true
  })
    .populate({
      path: 'serviceLocations',
      select: 'name slug category city imageCover'
    })
    .populate({
      path: 'reviews',
      select: 'review rating user createdAt'
    });

  if (!guide) {
    return next(new AppError('No approved guide found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { guide }
  });
});

// ─── Admin: Get Pending Guides ───────────────────────────────────
exports.getPendingGuides = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) {
    filter.verificationStatus = req.query.status;
  } else {
    filter.verificationStatus = 'pending_review';
  }

  const guides = await GuideProfile.find(filter)
    .populate({
      path: 'serviceLocations',
      select: 'name slug'
    })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: guides.length,
    data: { guides }
  });
});

// ─── Admin: Approve Guide ────────────────────────────────────────
exports.approveGuide = catchAsync(async (req, res, next) => {
  const profile = await GuideProfile.findById(req.params.id);

  if (!profile) {
    return next(new AppError('No guide profile found with that ID.', 404));
  }

  profile.verificationStatus = 'approved';
  profile.isPublic = true;
  profile.rejectionReason = undefined;
  await profile.save();

  res.status(200).json({
    status: 'success',
    message: 'Guide has been approved.',
    data: { profile }
  });
});

// ─── Admin: Reject Guide ─────────────────────────────────────────
exports.rejectGuide = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  if (!reason) {
    return next(new AppError('Please provide a rejection reason.', 400));
  }

  const profile = await GuideProfile.findById(req.params.id);

  if (!profile) {
    return next(new AppError('No guide profile found with that ID.', 404));
  }

  profile.verificationStatus = 'rejected';
  profile.isPublic = false;
  profile.rejectionReason = reason;
  await profile.save();

  res.status(200).json({
    status: 'success',
    message: 'Guide has been rejected.',
    data: { profile }
  });
});

// ─── Admin: Suspend Guide ────────────────────────────────────────
exports.suspendGuide = catchAsync(async (req, res, next) => {
  const profile = await GuideProfile.findById(req.params.id);

  if (!profile) {
    return next(new AppError('No guide profile found with that ID.', 404));
  }

  profile.verificationStatus = 'suspended';
  profile.isPublic = false;
  await profile.save();

  res.status(200).json({
    status: 'success',
    message: 'Guide has been suspended.',
    data: { profile }
  });
});

// ─── Admin/Guide: Get Document (Private) ─────────────────────────
exports.getDocument = catchAsync(async (req, res, next) => {
  const { guideId, docType } = req.params;

  // Only admin or the owning guide can access
  const profile = await GuideProfile.findById(guideId);
  if (!profile) {
    return next(new AppError('No guide profile found.', 404));
  }

  const profileUserId = profile.user._id
    ? profile.user._id.toString()
    : profile.user.toString();

  if (req.user.role !== 'admin' && req.user.id !== profileUserId) {
    return next(new AppError('You do not have permission to access this document.', 403));
  }

  if (!profile.documents || !profile.documents[docType]) {
    return next(new AppError('Document not found.', 404));
  }

  const filePath = path.join(
    __dirname, '..', 'private', 'uploads', 'guide-documents',
    profile.documents[docType]
  );

  if (!fs.existsSync(filePath)) {
    return next(new AppError('Document file not found on server.', 404));
  }

  res.sendFile(filePath);
});

// ─── Admin: Get All Guides ───────────────────────────────────────
exports.getAllGuides = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.verificationStatus = req.query.status;

  const guides = await GuideProfile.find(filter)
    .populate({
      path: 'serviceLocations',
      select: 'name slug'
    })
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: guides.length,
    data: { guides }
  });
});

// ─── Public: Price Preview ───────────────────────────────────────
// GET /guides/:id/price-preview?startDate=2025-08-15&numberOfDays=3
// Single source of truth — frontend never duplicates pricing logic.
exports.getPricePreview = catchAsync(async (req, res, next) => {
  const guide = await GuideProfile.findById(req.params.id);
  if (!guide) {
    return next(new AppError('No guide found with that ID.', 404));
  }

  const { startDate, numberOfDays } = req.query;
  if (!startDate || !numberOfDays) {
    return next(new AppError('Please provide startDate and numberOfDays query parameters.', 400));
  }

  const days = parseInt(numberOfDays, 10) || 1;
  const { _computeEffectivePrice } = require('./guideBookingController');
  const pricing = _computeEffectivePrice(guide, new Date(startDate));
  const totalPrice = pricing.effectivePricePerDay * days;

  res.status(200).json({
    status: 'success',
    data: {
      basePricePerDay: guide.pricePerDay,
      ...pricing,
      numberOfDays: days,
      totalPrice
    }
  });
});
