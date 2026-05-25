const mongoose = require('mongoose');
const slugify = require('slugify');

const placeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A place must have a name'],
      unique: true,
      trim: true,
      maxlength: [80, 'A place name must have less or equal than 80 characters'],
      minlength: [3, 'A place name must have more or equal than 3 characters']
    },
    slug: String,
    location: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      default: 'Maharashtra',
      trim: true
    },
    category: {
      type: String,
      required: [true, 'A place must have a category'],
      enum: {
        values: ['fort', 'trek', 'heritage', 'spiritual', 'village', 'city'],
        message: 'Category must be one of: fort, trek, heritage, spiritual, village, city'
      }
    },
    description: {
      type: String,
      trim: true,
      required: [true, 'A place must have a description']
    },
    history: {
      type: String,
      trim: true
    },
    difficultyLevel: {
      type: String,
      enum: {
        values: ['easy', 'moderate', 'difficult', 'expert'],
        message: 'Difficulty must be one of: easy, moderate, difficult, expert'
      },
      default: 'moderate'
    },
    bestSeason: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      default: 'default-place.jpg'
    },
    images: [String],
    coordinates: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number]
    },
    entryFee: {
      type: Number,
      default: 0
    },
    estimatedDuration: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    featured: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
placeSchema.index({ slug: 1 }, { unique: true });
placeSchema.index({ coordinates: '2dsphere' });
placeSchema.index({ category: 1 });
placeSchema.index({ featured: 1 });
placeSchema.index({ isActive: 1 });

// Virtual populate — guides serving this place
placeSchema.virtual('guides', {
  ref: 'GuideProfile',
  foreignField: 'serviceLocations',
  localField: '_id'
});

// Pre-save: auto-generate slug
placeSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});

// Query middleware: only show active places by default
placeSchema.pre(/^find/, function(next) {
  this.find({ isActive: { $ne: false } });
  next();
});

const Place = mongoose.model('Place', placeSchema);

module.exports = Place;
