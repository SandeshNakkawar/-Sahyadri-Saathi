const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'A seat lock must belong to a tour']
  },
  startDateId: {
    type: String,
    required: [true, 'A seat lock must have a tour start date ID']
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A seat lock must belong to a user']
  },
  seats: {
    type: Number,
    required: [true, 'A seat lock must specify the number of seats locked']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Automatically deletes the document after 5 minutes (300 seconds)
  }
});

seatLockSchema.index({ tour: 1, startDateId: 1 });

const SeatLock = mongoose.model('SeatLock', seatLockSchema);
module.exports = SeatLock;
