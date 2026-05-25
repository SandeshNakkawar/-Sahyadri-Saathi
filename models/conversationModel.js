const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A message must have a sender']
  },
  text: {
    type: String,
    required: [true, 'A message cannot be empty'],
    trim: true,
    maxlength: [2000, 'Message must be 2000 characters or less']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date
  }
});

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
      }
    ],
    booking: {
      type: mongoose.Schema.ObjectId,
      ref: 'GuideBooking',
      required: [true, 'A conversation must be linked to a booking']
    },
    messages: [messageSchema],
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
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
conversationSchema.index({ participants: 1 });
conversationSchema.index({ booking: 1 });
conversationSchema.index({ updatedAt: -1 });

// Update timestamp when new messages added
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Validate exactly 2 participants
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('A conversation must have exactly 2 participants'));
  }
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
