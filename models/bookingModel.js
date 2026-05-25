const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour!']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User!']
  },
  startDate: {
    type: Date,
    required: [true, 'Booking must have a start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Booking must have an end date']
  },
  guests: {
    type: Number,
    required: [true, 'Booking must have number of guests'],
    min: [1, 'Must have at least 1 guest'],
    default: 1
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price per person']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Booking must have a total price']
  },
  paid: {
    type: Boolean,
    default: false
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  status: {
    type: String,
    enum: [
      'pending_payment',
      'confirmed',
      'guide_assigned',
      'ready_for_trip',
      'completed',
      'cancelled',
      'refunded'
    ],
    default: 'pending_payment'
  },
  sessionId: {
    type: String,
    unique: true,
    sparse: true, // allows null values but ensures uniqueness when present
    index: true
  },
  guide: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  pickupLocation: {
    type: String,
    trim: true
  },
  adminNotes: {
    type: String,
    trim: true
  },
  tripInstructions: {
    type: String,
    trim: true
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  refundStatus: {
    type: String,
    enum: ['none', 'requested', 'processing', 'completed'],
    default: 'none'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
bookingSchema.index({ tour: 1, user: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startDate: 1 });
bookingSchema.index({ guide: 1 });
bookingSchema.index({ user: 1, status: 1 });

// Auto-calculate totalPrice if not set
bookingSchema.pre('save', function(next) {
  if (this.isNew && !this.totalPrice && this.price && this.guests) {
    this.totalPrice = this.price * this.guests;
  }
  next();
});

// Populate tour, user, and guide on find queries
bookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name email photo'
  }).populate({
    path: 'tour',
    select: 'name slug imageCover duration price startLocation'
  }).populate({
    path: 'guide',
    select: 'name email photo'
  });
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;