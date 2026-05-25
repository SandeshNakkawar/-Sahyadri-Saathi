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
