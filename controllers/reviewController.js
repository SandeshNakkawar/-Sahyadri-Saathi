const Review = require('./../models/reviewModel');
const Booking = require('./../models/bookingModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.setTourUserIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// Verify user has a completed booking before allowing a review
exports.verifyBooking = catchAsync(async (req, res, next) => {
  const tourId = req.body.tour || req.params.tourId;

  if (!tourId) {
    return next(new AppError('Please specify a tour to review', 400));
  }

  const booking = await Booking.findOne({
    tour: tourId,
    user: req.user.id,
    status: 'completed'
  });

  if (!booking) {
    return next(
      new AppError(
        'You can only review tours that you have booked and experienced',
        403
      )
    );
  }

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
