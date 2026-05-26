const mongoose = require('mongoose');

const guideBookingSchema = new mongoose.Schema(
  {
    tourist: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A booking must have a tourist']
    },
    guideProfile: {
      type: mongoose.Schema.ObjectId,
      ref: 'GuideProfile',
      required: [true, 'A booking must have a guide profile']
    },
    place: {
      type: mongoose.Schema.ObjectId,
      ref: 'Place',
      required: [true, 'A booking must be for a place']
    },
    startDate: {
      type: Date,
      required: [true, 'A booking must have a start date']
    },
    endDate: {
      type: Date,
      required: [true, 'A booking must have an end date']
    },
    numberOfDays: {
      type: Number,
      min: [1, 'Booking must be at least 1 day']
    },
    numberOfTravelers: {
      type: Number,
      required: [true, 'Please specify number of travelers'],
      min: [1, 'Must have at least 1 traveler'],
      default: 1
    },
    totalPrice: {
      type: Number,
      required: [true, 'A booking must have a total price']
    },
    // ─── Price snapshot: frozen pricing breakdown at booking time ──
    priceSnapshot: {
      basePricePerDay: Number,
      effectivePricePerDay: Number,
      seasonalMultiplier: { type: Number, default: 1 },
      seasonName: String,
      weekendSurchargeApplied: { type: Boolean, default: false },
      weekendSurchargePercent: { type: Number, default: 0 },
      advanceDiscountApplied: { type: Boolean, default: false },
      advanceDiscountPercent: { type: Number, default: 0 },
      daysBookedInAdvance: Number
    },
    platformCommissionRate: {
      type: Number,
      default: parseFloat(process.env.PLATFORM_COMMISSION_RATE) || 0.15
    },
    platformCommissionAmount: {
      type: Number
    },
    guidePayoutAmount: {
      type: Number
    },
    status: {
      type: String,
      enum: [
        'pending',
        'accepted',
        'rejected',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'disputed'
      ],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid'
    },
    payoutStatus: {
      type: String,
      enum: [
        'not_eligible',
        'request_allowed',
        'requested',
        'paid',
        'on_hold',
        'rejected'
      ],
      default: 'not_eligible'
    },
    // Trip completion tracking — both sides must confirm
    completion: {
      guideMarkedCompleted: {
        type: Boolean,
        default: false
      },
      touristConfirmedCompleted: {
        type: Boolean,
        default: false
      },
      guideCompletedAt: Date,
      touristCompletedAt: Date,
      completedAt: Date
    },
    stripeCheckoutSessionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    stripePaymentIntentId: {
      type: String
    },
    meetingPoint: {
      type: String,
      trim: true
    },
    specialRequests: {
      type: String,
      trim: true
    },
    cancellationReason: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
guideBookingSchema.index({ tourist: 1, createdAt: -1 });
guideBookingSchema.index({ guideProfile: 1, startDate: 1 });
guideBookingSchema.index({ status: 1 });
guideBookingSchema.index({ payoutStatus: 1 });
guideBookingSchema.index({ place: 1 });

// Pre-save: auto-calculate numberOfDays, commission, and payout
guideBookingSchema.pre('save', function(next) {
  // Calculate number of days
  if (this.startDate && this.endDate) {
    const diffMs = new Date(this.endDate) - new Date(this.startDate);
    this.numberOfDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  // Calculate commission and payout
  if (this.totalPrice && this.platformCommissionRate) {
    this.platformCommissionAmount = Math.round(
      this.totalPrice * this.platformCommissionRate * 100
    ) / 100;
    this.guidePayoutAmount = Math.round(
      (this.totalPrice - this.platformCommissionAmount) * 100
    ) / 100;
  }

  // Auto-set completedAt when both sides confirm
  if (
    this.completion &&
    this.completion.guideMarkedCompleted &&
    this.completion.touristConfirmedCompleted &&
    !this.completion.completedAt
  ) {
    this.completion.completedAt = new Date();
    this.status = 'completed';
    this.payoutStatus = 'request_allowed';
  }

  next();
});

// Populate references on find
guideBookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'tourist',
    select: 'name email photo phone'
  })
    .populate({
      path: 'guideProfile',
      select: 'displayName profilePhoto user baseCity pricePerDay ratingsAverage verificationStatus'
    })
    .populate({
      path: 'place',
      select: 'name slug imageCover category city'
    });
  next();
});

const GuideBooking = mongoose.model('GuideBooking', guideBookingSchema);

module.exports = GuideBooking;
