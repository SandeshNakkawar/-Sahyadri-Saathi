const GuideBooking = require('../models/guideBookingModel');
const GuideProfile = require('../models/guideProfileModel');
const Place = require('../models/placeModel');
const DateLock = require('../models/dateLockModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ─── Helper: Check for overlapping bookings ──────────────────────
const checkOverlap = async (guideProfileId, startDate, endDate, excludeBookingId) => {
  const filter = {
    guideProfile: guideProfileId,
    startDate: { $lte: new Date(endDate) },
    endDate: { $gte: new Date(startDate) },
    status: { $in: ['pending', 'accepted', 'confirmed', 'in_progress'] }
  };
  if (excludeBookingId) {
    filter._id = { $ne: excludeBookingId };
  }
  return await GuideBooking.findOne(filter);
};

// ─── Helper: Expand date range into individual dates ─────────────
const expandDates = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// ─── Pricing Engine ──────────────────────────────────────────────
const computeEffectivePrice = (guide, startDate) => {
  let effectivePrice = guide.pricePerDay;
  let seasonalMultiplier = 1;
  let seasonName = null;
  let weekendSurchargeApplied = false;
  let advanceDiscountApplied = false;
  let advanceDiscountPercent = 0;

  const month = new Date(startDate).getMonth() + 1; // 1–12
  const dayOfWeek = new Date(startDate).getDay();   // 0=Sun, 6=Sat

  // 1. Seasonal multiplier — find the rule whose month range contains the trek start month
  if (guide.pricingRules && guide.pricingRules.length > 0) {
    const rule = guide.pricingRules.find(r => {
      if (r.startMonth <= r.endMonth) {
        return month >= r.startMonth && month <= r.endMonth;
      }
      // Wrapping range (e.g., Nov–Feb: startMonth=11, endMonth=2)
      return month >= r.startMonth || month <= r.endMonth;
    });
    if (rule) {
      seasonalMultiplier = rule.multiplier;
      seasonName = rule.name;
      effectivePrice *= seasonalMultiplier;
    }
  }

  // 2. Weekend surcharge (Saturday = day 6)
  if (guide.weekendSurchargePercent > 0 && dayOfWeek === 6) {
    weekendSurchargeApplied = true;
    effectivePrice *= (1 + guide.weekendSurchargePercent / 100);
  }

  // 3. Advance booking discount — Math.round so 29.9 days → 30, not 29
  const daysBookedInAdvance = Math.round(
    (new Date(startDate) - new Date()) / (1000 * 60 * 60 * 24)
  );
  if (
    guide.advanceBookingDiscount &&
    guide.advanceBookingDiscount.daysInAdvance > 0 &&
    guide.advanceBookingDiscount.discountPercent > 0 &&
    daysBookedInAdvance >= guide.advanceBookingDiscount.daysInAdvance
  ) {
    advanceDiscountApplied = true;
    advanceDiscountPercent = guide.advanceBookingDiscount.discountPercent;
    effectivePrice *= (1 - advanceDiscountPercent / 100);
  }

  return {
    effectivePricePerDay: Math.round(effectivePrice),
    seasonalMultiplier,
    seasonName,
    weekendSurchargeApplied,
    weekendSurchargePercent: guide.weekendSurchargePercent || 0,
    advanceDiscountApplied,
    advanceDiscountPercent,
    daysBookedInAdvance
  };
};

// Export for reuse in price preview endpoint
exports._computeEffectivePrice = computeEffectivePrice;

// ─── Create Booking Request (Tourist) ────────────────────────────
exports.createBookingRequest = catchAsync(async (req, res, next) => {
  const { guideProfileId, placeId, startDate, endDate, numberOfTravelers, meetingPoint, specialRequests } = req.body;

  // Validate guide exists and is approved
  const guide = await GuideProfile.findById(guideProfileId);
  if (!guide || guide.verificationStatus !== 'approved' || !guide.isPublic) {
    return next(new AppError('This guide is not available for booking.', 400));
  }

  // Validate place exists
  const place = await Place.findById(placeId);
  if (!place) {
    return next(new AppError('No place found with that ID.', 404));
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start < new Date()) {
    return next(new AppError('Start date cannot be in the past.', 400));
  }
  if (end < start) {
    return next(new AppError('End date must be after start date.', 400));
  }

  // Validate group size
  const travelers = parseInt(numberOfTravelers, 10) || 1;
  if (travelers > guide.maxGroupSize) {
    return next(new AppError(`This guide accepts a maximum of ${guide.maxGroupSize} travelers.`, 400));
  }

  // ─── Dynamic Pricing Engine ──────────────────────────────────
  const diffMs = end - start;
  const numberOfDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const pricing = computeEffectivePrice(guide, start);
  const totalPrice = pricing.effectivePricePerDay * numberOfDays;

  // ─── Atomic Date Locking ─────────────────────────────────────
  // Create the booking first (we need the _id for lock documents)
  const booking = await GuideBooking.create({
    tourist: req.user.id,
    guideProfile: guideProfileId,
    place: placeId,
    startDate: start,
    endDate: end,
    numberOfDays,
    numberOfTravelers: travelers,
    totalPrice,
    priceSnapshot: {
      basePricePerDay: guide.pricePerDay,
      ...pricing
    },
    meetingPoint,
    specialRequests,
    status: 'pending',
    paymentStatus: 'unpaid',
    payoutStatus: 'not_eligible'
  });

  // Now try to acquire date locks — the unique index is the concurrency guard.
  // If ANY date is already locked by another booking, insertMany throws a
  // DuplicateKeyError and we rollback the booking.
  const datesToLock = expandDates(start, end);
  const lockDocs = datesToLock.map(d => ({
    guideProfile: guideProfileId,
    date: d,
    booking: booking._id,
    lockedBy: req.user.id
  }));

  try {
    await DateLock.insertMany(lockDocs, { ordered: true });
  } catch (lockErr) {
    // Lock failed — another booking holds these dates. Roll back.
    await GuideBooking.findByIdAndDelete(booking._id);

    if (lockErr.code === 11000) {
      return next(new AppError(
        'This guide is already booked for one or more of your selected dates. Please choose different dates.',
        409
      ));
    }
    throw lockErr; // unexpected error — let global handler catch it
  }

  res.status(201).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Get My Bookings (Tourist) ───────────────────────────────────
exports.getMyBookings = catchAsync(async (req, res, next) => {
  const filter = { tourist: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const bookings = await GuideBooking.find(filter)
    .populate('place guideProfile')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

// ─── Get Guide's Booking Requests (Guide) ────────────────────────
exports.getGuideRequests = catchAsync(async (req, res, next) => {
  const profile = await GuideProfile.findOne({ user: req.user.id }).select('_id');
  if (!profile) {
    return next(new AppError('Guide profile not found.', 404));
  }

  const filter = { guideProfile: profile._id };
  if (req.query.status) filter.status = req.query.status;

  const bookings = await GuideBooking.find(filter)
    .populate('place tourist')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

// ─── Accept Booking (Guide) ──────────────────────────────────────
exports.acceptBooking = catchAsync(async (req, res, next) => {
  const profile = await GuideProfile.findOne({ user: req.user.id }).select('_id');
  if (!profile) {
    return next(new AppError('Guide profile not found.', 404));
  }

  const booking = await GuideBooking.findOne({
    _id: req.params.id,
    guideProfile: profile._id,
    status: 'pending'
  });

  if (!booking) {
    return next(new AppError('No pending booking found with that ID for your profile.', 404));
  }

  // Re-check for overlaps before accepting
  const overlap = await checkOverlap(
    profile._id,
    booking.startDate,
    booking.endDate,
    booking._id
  );
  if (overlap) {
    return next(new AppError('You already have a booking during these dates. Reject this one or cancel the other first.', 400));
  }

  booking.status = 'accepted';
  await booking.save();

  res.status(200).json({
    status: 'success',
    message: 'Booking accepted. Tourist can now proceed to payment.',
    data: { booking }
  });
});

// ─── Reject Booking (Guide) ─────────────────────────────────────
exports.rejectBooking = catchAsync(async (req, res, next) => {
  const profile = await GuideProfile.findOne({ user: req.user.id }).select('_id');
  if (!profile) {
    return next(new AppError('Guide profile not found.', 404));
  }

  const booking = await GuideBooking.findOne({
    _id: req.params.id,
    guideProfile: profile._id,
    status: 'pending'
  });

  if (!booking) {
    return next(new AppError('No pending booking found with that ID for your profile.', 404));
  }

  booking.status = 'rejected';
  booking.cancellationReason = req.body.reason || 'Rejected by guide';
  await booking.save();

  // Release date locks so those dates become available again
  await DateLock.deleteMany({ booking: booking._id });

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Cancel Booking (Tourist / Admin) ────────────────────────────
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await GuideBooking.findById(req.params.id);
  if (!booking) {
    return next(new AppError('No booking found with that ID.', 404));
  }

  // Tourists can only cancel their own bookings
  const touristId = booking.tourist._id
    ? booking.tourist._id.toString()
    : booking.tourist.toString();

  if (req.user.role === 'tourist' && req.user.id !== touristId) {
    return next(new AppError('You can only cancel your own bookings.', 403));
  }

  if (['cancelled', 'completed', 'disputed'].includes(booking.status)) {
    return next(new AppError(`Cannot cancel a booking with status: ${booking.status}`, 400));
  }

  booking.status = 'cancelled';
  booking.cancellationReason = req.body.reason || 'Cancelled by user';
  await booking.save();

  // Release date locks so those dates become available again
  await DateLock.deleteMany({ booking: booking._id });

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Start Trip (Guide / Admin) ──────────────────────────────────
exports.startTrip = catchAsync(async (req, res, next) => {
  const booking = await GuideBooking.findById(req.params.id);
  if (!booking) {
    return next(new AppError('No booking found with that ID.', 404));
  }

  if (booking.status !== 'confirmed') {
    return next(new AppError('Only confirmed bookings can be started.', 400));
  }

  // Verify this guide owns the booking
  if (req.user.role === 'guide') {
    const profile = await GuideProfile.findOne({ user: req.user.id }).select('_id');
    const bookingGuideId = booking.guideProfile._id
      ? booking.guideProfile._id.toString()
      : booking.guideProfile.toString();
    if (!profile || profile._id.toString() !== bookingGuideId) {
      return next(new AppError('This booking is not assigned to you.', 403));
    }
  }

  booking.status = 'in_progress';
  await booking.save();

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Guide Mark Complete ─────────────────────────────────────────
exports.guideMarkComplete = catchAsync(async (req, res, next) => {
  const profile = await GuideProfile.findOne({ user: req.user.id }).select('_id');
  if (!profile) {
    return next(new AppError('Guide profile not found.', 404));
  }

  const booking = await GuideBooking.findOne({
    _id: req.params.id,
    guideProfile: profile._id,
    status: { $in: ['confirmed', 'in_progress'] }
  });

  if (!booking) {
    return next(new AppError('No active booking found with that ID for your profile.', 404));
  }

  booking.completion.guideMarkedCompleted = true;
  booking.completion.guideCompletedAt = new Date();

  // If tourist already confirmed, this save will trigger auto-completion via pre-save hook
  await booking.save();

  res.status(200).json({
    status: 'success',
    message: booking.completion.touristConfirmedCompleted
      ? 'Trip marked as completed by both sides. You can now request payout.'
      : 'Trip marked as completed from your side. Waiting for tourist confirmation.',
    data: { booking }
  });
});

// ─── Tourist Confirm Complete ────────────────────────────────────
exports.touristConfirmComplete = catchAsync(async (req, res, next) => {
  const booking = await GuideBooking.findOne({
    _id: req.params.id,
    tourist: req.user.id,
    status: { $in: ['confirmed', 'in_progress'] }
  });

  if (!booking) {
    return next(new AppError('No active booking found with that ID.', 404));
  }

  booking.completion.touristConfirmedCompleted = true;
  booking.completion.touristCompletedAt = new Date();

  // If guide already marked complete, this save will trigger auto-completion via pre-save hook
  await booking.save();

  res.status(200).json({
    status: 'success',
    message: booking.completion.guideMarkedCompleted
      ? 'Trip confirmed as completed by both sides.'
      : 'Trip confirmed from your side. Waiting for guide confirmation.',
    data: { booking }
  });
});

// ─── Get Single Booking ──────────────────────────────────────────
exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await GuideBooking.findById(req.params.id)
    .populate('place tourist guideProfile');
  if (!booking) {
    return next(new AppError('No booking found with that ID.', 404));
  }

  // Check access
  const touristId = booking.tourist._id
    ? booking.tourist._id.toString()
    : booking.tourist.toString();

  if (req.user.role === 'tourist' && req.user.id !== touristId) {
    return next(new AppError('You do not have access to this booking.', 403));
  }

  if (req.user.role === 'guide') {
    const profile = await GuideProfile.findOne({ user: req.user.id }).select('_id');
    const bookingGuideId = booking.guideProfile._id
      ? booking.guideProfile._id.toString()
      : booking.guideProfile.toString();
    if (!profile || profile._id.toString() !== bookingGuideId) {
      return next(new AppError('You do not have access to this booking.', 403));
    }
  }

  res.status(200).json({
    status: 'success',
    data: { booking }
  });
});

// ─── Admin: Get All Bookings ─────────────────────────────────────
exports.getAllBookings = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.payoutStatus) filter.payoutStatus = req.query.payoutStatus;

  const bookings = await GuideBooking.find(filter)
    .populate('place tourist guideProfile')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: bookings.length,
    data: { bookings }
  });
});

// ─── Public: Get Guide Blocked Dates ─────────────────────────────
// Returns date ranges where this guide is already booked.
// Computed live — cancelled/rejected bookings free up automatically.
exports.getGuideBlockedDates = catchAsync(async (req, res, next) => {
  const bookings = await GuideBooking.find({
    guideProfile: req.params.guideProfileId,
    status: { $in: ['pending', 'accepted', 'confirmed', 'in_progress'] }
  }).select('startDate endDate status');

  const blockedDates = bookings.map(b => ({
    startDate: b.startDate,
    endDate: b.endDate,
    status: b.status
  }));

  res.status(200).json({
    status: 'success',
    results: blockedDates.length,
    data: { blockedDates }
  });
});
