const mongoose = require('mongoose');

const guideProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A guide profile must belong to a user']
    },
    displayName: {
      type: String,
      trim: true,
      required: [true, 'Please provide a display name']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio must be 1000 characters or less']
    },
    profilePhoto: {
      type: String,
      default: 'default.jpg'
    },
    baseCity: {
      type: String,
      trim: true
    },
    serviceLocations: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Place'
      }
    ],
    languages: [
      {
        type: String,
        trim: true
      }
    ],
    specialties: [
      {
        type: String,
        enum: [
          'history',
          'trekking',
          'photography',
          'food',
          'culture',
          'family',
          'translation',
          'solo'
        ]
      }
    ],
    experienceYears: {
      type: Number,
      default: 0,
      min: [0, 'Experience years cannot be negative']
    },
    pricePerDay: {
      type: Number,
      min: [0, 'Price per day cannot be negative']
    },
    halfDayPrice: {
      type: Number,
      min: [0, 'Half-day price cannot be negative']
    },
    // ─── Dynamic Pricing ─────────────────────────────────────
    pricingRules: [
      {
        name: {
          type: String,
          trim: true,
          required: [true, 'Pricing rule must have a name']
        },
        startMonth: {
          type: Number,
          required: true,
          min: [1, 'Month must be between 1 and 12'],
          max: [12, 'Month must be between 1 and 12']
        },
        endMonth: {
          type: Number,
          required: true,
          min: [1, 'Month must be between 1 and 12'],
          max: [12, 'Month must be between 1 and 12']
        },
        multiplier: {
          type: Number,
          required: true,
          min: [0.5, 'Multiplier must be at least 0.5'],
          max: [3, 'Multiplier cannot exceed 3x'],
          default: 1
        }
      }
    ],
    advanceBookingDiscount: {
      daysInAdvance: { type: Number, default: 0, min: 0 },
      discountPercent: { type: Number, default: 0, min: 0, max: 50 }
    },
    weekendSurchargePercent: {
      type: Number,
      default: 0,
      min: [0, 'Weekend surcharge cannot be negative'],
      max: [50, 'Weekend surcharge cannot exceed 50%']
    },
    maxGroupSize: {
      type: Number,
      default: 10,
      min: [1, 'Group size must be at least 1']
    },
    availability: [
      {
        startDate: Date,
        endDate: Date
      }
    ],
    travelRadiusKm: {
      type: Number,
      default: 50
    },
    // Documents stored in private/uploads/guide-documents/ (non-public)
    documents: {
      idProof: {
        type: String // filename in private directory
      },
      addressProof: {
        type: String
      },
      certificate: {
        type: String // optional license/certificate
      }
    },
    verificationStatus: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'suspended'],
      default: 'draft'
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be above 0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    isPublic: {
      type: Boolean,
      default: false
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

// ─── Validate overlapping pricing rules ──────────────────────────
guideProfileSchema.pre('save', function(next) {
  if (!this.pricingRules || this.pricingRules.length < 2) return next();

  // Expand each rule into a Set of months it covers
  const expandMonths = (start, end) => {
    const months = new Set();
    if (start <= end) {
      for (let m = start; m <= end; m++) months.add(m);
    } else {
      // Wrapping range (e.g. Nov=11 to Feb=2)
      for (let m = start; m <= 12; m++) months.add(m);
      for (let m = 1; m <= end; m++) months.add(m);
    }
    return months;
  };

  // Check every pair for overlap
  for (let i = 0; i < this.pricingRules.length; i++) {
    const monthsA = expandMonths(
      this.pricingRules[i].startMonth,
      this.pricingRules[i].endMonth
    );
    for (let j = i + 1; j < this.pricingRules.length; j++) {
      const monthsB = expandMonths(
        this.pricingRules[j].startMonth,
        this.pricingRules[j].endMonth
      );
      for (const m of monthsA) {
        if (monthsB.has(m)) {
          return next(
            new Error(
              `Pricing rules "${this.pricingRules[i].name}" and "${this.pricingRules[j].name}" overlap in month ${m}. Each month can only belong to one pricing rule.`
            )
          );
        }
      }
    }
  }

  next();
});

// Indexes
guideProfileSchema.index({ user: 1 }, { unique: true });
guideProfileSchema.index({ verificationStatus: 1 });
guideProfileSchema.index({ serviceLocations: 1 });
guideProfileSchema.index({ isPublic: 1 });
guideProfileSchema.index({ ratingsAverage: -1 });

// Virtual populate — reviews for this guide
guideProfileSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'guideProfile',
  localField: '_id'
});

// Populate user on find queries
guideProfileSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name email photo phone'
  });
  next();
});

const GuideProfile = mongoose.model('GuideProfile', guideProfileSchema);

module.exports = GuideProfile;
