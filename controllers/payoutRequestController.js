const PayoutRequest = require('../models/payoutRequestModel');
const GuideBooking = require('../models/guideBookingModel');
const GuideProfile = require('../models/guideProfileModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ─── Create Payout Request (Guide) ──────────────────────────────
exports.createPayoutRequest = catchAsync(async (req, res, next) => {
  const { upiId, upiAccountName } = req.body;

  if (!upiId || !upiAccountName) {
    return next(new AppError('Please provide your UPI ID and account name.', 400));
  }

  // Validate UPI format (basic check)
  if (!upiId.includes('@')) {
    return next(new AppError('Please provide a valid UPI ID (e.g., name@upi).', 400));
  }

  // Get guide profile
  const profile = await GuideProfile.findOne({ user: req.user.id }).select('_id');
  if (!profile) {
    return next(new AppError('Guide profile not found.', 404));
  }

  // Get booking
  const booking = await GuideBooking.findOne({
    _id: req.params.bookingId,
    guideProfile: profile._id
  });

  if (!booking) {
    return next(new AppError('No booking found with that ID for your profile.', 404));
  }

  // Validate booking is completed and payout is allowed
  if (booking.payoutStatus !== 'request_allowed') {
    return next(new AppError(
      'Payout request is not allowed. Both guide and tourist must confirm trip completion first.',
      400
    ));
  }

  if (booking.paymentStatus !== 'paid') {
    return next(new AppError('Cannot request payout for an unpaid booking.', 400));
  }

  // Check for existing active payout request (only one per booking)
  const existingRequest = await PayoutRequest.findOne({
    booking: booking._id,
    status: { $in: ['requested', 'on_hold'] }
  });

  if (existingRequest) {
    return next(new AppError(
      'There is already an active payout request for this booking. Please wait for admin to process it.',
      400
    ));
  }

  // Create payout request
  const payoutRequest = await PayoutRequest.create({
    booking: booking._id,
    guideProfile: profile._id,
    amount: booking.guidePayoutAmount,
    platformCommissionAmount: booking.platformCommissionAmount,
    temporaryUpiId: upiId,
    upiAccountName,
    status: 'requested'
  });

  // Update booking payout status
  booking.payoutStatus = 'requested';
  await booking.save({ validateBeforeSave: false });

  res.status(201).json({
    status: 'success',
    message: 'Payout request submitted. Admin will process it shortly.',
    data: { payoutRequest }
  });
});

// ─── Get My Payout Requests (Guide) ─────────────────────────────
exports.getMyPayoutRequests = catchAsync(async (req, res, next) => {
  const profile = await GuideProfile.findOne({ user: req.user.id }).select('_id');
  if (!profile) {
    return next(new AppError('Guide profile not found.', 404));
  }

  const payouts = await PayoutRequest.find({ guideProfile: profile._id })
    .sort({ requestedAt: -1 });

  res.status(200).json({
    status: 'success',
    results: payouts.length,
    data: { payouts }
  });
});

// ─── Admin: Get All Payout Requests ─────────────────────────────
exports.getAdminPayoutRequests = catchAsync(async (req, res, next) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const payouts = await PayoutRequest.find(filter)
    .populate('guideProfile')
    .sort({ requestedAt: -1 });

  res.status(200).json({
    status: 'success',
    results: payouts.length,
    data: { payouts }
  });
});

// ─── Admin: Mark Payout as Paid ──────────────────────────────────
exports.markPaid = catchAsync(async (req, res, next) => {
  const { transactionRef, adminNote } = req.body;

  if (!transactionRef) {
    return next(new AppError('Please provide a transaction/reference ID.', 400));
  }

  const payout = await PayoutRequest.markAsPaid(
    req.params.id,
    transactionRef,
    adminNote
  );

  res.status(200).json({
    status: 'success',
    message: 'Payout marked as paid. Guide earnings updated.',
    data: { payout }
  });
});

// ─── Admin: Hold Payout ──────────────────────────────────────────
exports.holdPayout = catchAsync(async (req, res, next) => {
  const payout = await PayoutRequest.findById(req.params.id);
  if (!payout) {
    return next(new AppError('No payout request found with that ID.', 404));
  }

  if (payout.status === 'paid') {
    return next(new AppError('Cannot hold an already paid payout.', 400));
  }

  payout.status = 'on_hold';
  payout.adminNote = req.body.adminNote || 'Placed on hold by admin';
  await payout.save();

  // Update booking
  await GuideBooking.findByIdAndUpdate(payout.booking._id || payout.booking, {
    payoutStatus: 'on_hold'
  });

  res.status(200).json({
    status: 'success',
    data: { payout }
  });
});

// ─── Admin: Reject Payout ────────────────────────────────────────
exports.rejectPayout = catchAsync(async (req, res, next) => {
  const payout = await PayoutRequest.findById(req.params.id);
  if (!payout) {
    return next(new AppError('No payout request found with that ID.', 404));
  }

  if (payout.status === 'paid') {
    return next(new AppError('Cannot reject an already paid payout.', 400));
  }

  payout.status = 'rejected';
  payout.adminNote = req.body.adminNote || 'Rejected by admin';
  // Clear temporary UPI on rejection
  payout.temporaryUpiId = undefined;
  await payout.save();

  // Update booking — allow guide to request again
  await GuideBooking.findByIdAndUpdate(payout.booking._id || payout.booking, {
    payoutStatus: 'rejected'
  });

  res.status(200).json({
    status: 'success',
    data: { payout }
  });
});
