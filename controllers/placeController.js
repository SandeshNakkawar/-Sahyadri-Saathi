const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const Place = require('../models/placeModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// ─── Image Upload Setup ──────────────────────────────────────────
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

exports.uploadPlaceImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);

exports.resizePlaceImages = catchAsync(async (req, res, next) => {
  if (!req.files) return next();

  const placesDir = path.join(__dirname, '..', 'public', 'img', 'places');
  await fs.promises.mkdir(placesDir, { recursive: true });

  // Cover image
  if (req.files.imageCover) {
    const filename = `place-${req.params.id || 'new'}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(path.join(placesDir, filename));
    req.body.imageCover = filename;
  }

  // Gallery images
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const filename = `place-${req.params.id || 'new'}-${Date.now()}-${i + 1}.jpeg`;
        await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 90 })
          .toFile(path.join(placesDir, filename));
        req.body.images.push(filename);
      })
    );
  }

  next();
});

// ─── Get Place by Slug ───────────────────────────────────────────
exports.getPlaceBySlug = catchAsync(async (req, res, next) => {
  const place = await Place.findOne({ slug: req.params.slug }).populate({
    path: 'guides',
    match: { verificationStatus: 'approved', isPublic: true },
    select: 'displayName profilePhoto user baseCity languages specialties pricePerDay ratingsAverage ratingsQuantity'
  });

  if (!place) {
    return next(new AppError('No place found with that name.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { place }
  });
});

// ─── Get Featured Places ─────────────────────────────────────────
exports.getFeaturedPlaces = (req, res, next) => {
  req.query.featured = 'true';
  req.query.limit = '6';
  req.query.sort = '-createdAt';
  next();
};

// ─── Factory CRUD ────────────────────────────────────────────────
exports.getAllPlaces = factory.getAll(Place);
exports.getPlace = factory.getOne(Place, { path: 'guides' });
exports.createPlace = factory.createOne(Place);
exports.updatePlace = factory.updateOne(Place);
exports.deletePlace = factory.deleteOne(Place);
