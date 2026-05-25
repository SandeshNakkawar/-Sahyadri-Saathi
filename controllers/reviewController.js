const Review = require('../models/reviewModel');
const GuideBooking = require('../models/guideBookingModel');
const GuideProfile = require('../models/guideProfileModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Set guide profile and user IDs from request
exports.setGuideUserIds = (req, res, next) => {
  if (!req.body.guideProfile) req.body.guideProfile = req.params.guideProfileId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Verify user has a completed booking before allowing a review
exports.verifyCompletedBooking = catchAsync(async (req, res, next) => {
  const bookingId = req.body.booking || req.params.bookingId;

  if (!bookingId) {
    return next(new AppError('Please specify a booking to review.', 400));
  }

  const booking = await GuideBooking.findOne({
    _id: bookingId,
    tourist: req.user.id,
    status: 'completed'
  });

  if (!booking) {
    return next(
      new AppError(
        'You can only review guides from completed bookings that you made.',
        403
      )
    );
  }

  // Verify both sides confirmed completion
  if (
    !booking.completion ||
    !booking.completion.guideMarkedCompleted ||
    !booking.completion.touristConfirmedCompleted
  ) {
    return next(
      new AppError(
        'Both guide and tourist must confirm trip completion before a review can be submitted.',
        403
      )
    );
  }

  // Set guideProfile from booking if not provided
  if (!req.body.guideProfile) {
    req.body.guideProfile = booking.guideProfile._id || booking.guideProfile;
  }
  req.body.booking = bookingId;

  next();
});

// Verify user owns the review (for update/delete)
exports.verifyOwnership = catchAsync(async (req, res, next) => {
  // Admins can update/delete any review
  if (req.user.role === 'admin') return next();

  const review = await Review.findById(req.params.id);
  if (!review) {
    return next(new AppError('No review found with that ID', 404));
  }

  const reviewUserId = review.user._id
    ? review.user._id.toString()
    : review.user.toString();

  if (reviewUserId !== req.user.id) {
    return next(
      new AppError('You can only modify your own reviews', 403)
    );
  }

  next();
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
