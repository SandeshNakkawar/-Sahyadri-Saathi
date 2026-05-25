// review / rating / createdAt / ref to guideProfile / ref to user / ref to booking
const mongoose = require('mongoose');
const GuideProfile = require('./guideProfileModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    guideProfile: {
      type: mongoose.Schema.ObjectId,
      ref: 'GuideProfile',
      required: [true, 'Review must belong to a guide.']
    },
    booking: {
      type: mongoose.Schema.ObjectId,
      ref: 'GuideBooking',
      required: [true, 'Review must reference a booking.']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// One review per booking (allows same tourist to review same guide on future trips)
reviewSchema.index({ booking: 1 }, { unique: true });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function(guideProfileId) {
  const stats = await this.aggregate([
    {
      $match: { guideProfile: guideProfileId }
    },
    {
      $group: {
        _id: '$guideProfile',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await GuideProfile.findByIdAndUpdate(guideProfileId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await GuideProfile.findByIdAndUpdate(guideProfileId, {
      ratingsQuantity: 0,
      ratingsAverage: 0
    });
  }
};

reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.guideProfile);
});

// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.clone().findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function() {
  if (this.r) {
    await this.r.constructor.calcAverageRatings(this.r.guideProfile);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
