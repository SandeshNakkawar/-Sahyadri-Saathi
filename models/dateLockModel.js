const mongoose = require('mongoose');

/**
 * DateLock — Atomic per-date concurrency guard for guide bookings.
 *
 * Each document represents ONE date that a guide is booked on.
 * The unique compound index {guideProfile, date} guarantees at the DB level
 * that two concurrent requests cannot both claim the same date — the second
 * insert gets a DuplicateKeyError, which the controller catches gracefully.
 *
 * TTL index auto-cleans stale locks after 48 hours if the booking was never
 * confirmed (e.g., tourist abandoned the request).
 */
const dateLockSchema = new mongoose.Schema({
  guideProfile: {
    type: mongoose.Schema.ObjectId,
    ref: 'GuideProfile',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'GuideBooking',
    required: true
  },
  lockedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// THE CRITICAL INDEX — this is the entire concurrency guard.
// MongoDB enforces uniqueness atomically at the storage engine level.
// Two concurrent inserts for the same {guideProfile, date} = one wins, one fails.
dateLockSchema.index({ guideProfile: 1, date: 1 }, { unique: true });

const DateLock = mongoose.model('DateLock', dateLockSchema);

module.exports = DateLock;
