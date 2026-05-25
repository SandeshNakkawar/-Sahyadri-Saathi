const Conversation = require('../models/conversationModel');
const GuideBooking = require('../models/guideBookingModel');
const GuideProfile = require('../models/guideProfileModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ─── Get or Create Conversation ──────────────────────────────────
exports.getOrCreateConversation = catchAsync(async (req, res, next) => {
  const booking = await GuideBooking.findById(req.params.bookingId);

  if (!booking) {
    return next(new AppError('No booking found with that ID.', 404));
  }

  // Chat only available after booking is accepted or paid
  if (!['accepted', 'confirmed', 'in_progress', 'completed'].includes(booking.status)) {
    return next(new AppError('Chat is available only after the booking is accepted.', 400));
  }

  // Determine participants
  const touristId = booking.tourist._id
    ? booking.tourist._id.toString()
    : booking.tourist.toString();

  const guideProfile = await GuideProfile.findById(
    booking.guideProfile._id || booking.guideProfile
  );
  if (!guideProfile) {
    return next(new AppError('Guide profile not found.', 404));
  }
  const guideUserId = guideProfile.user._id
    ? guideProfile.user._id.toString()
    : guideProfile.user.toString();

  // Verify current user is a participant
  if (req.user.id !== touristId && req.user.id !== guideUserId) {
    return next(new AppError('You are not a participant in this booking.', 403));
  }

  // Find or create conversation
  let conversation = await Conversation.findOne({ booking: booking._id });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [touristId, guideUserId],
      booking: booking._id,
      messages: []
    });
  }

  // Populate participants for response
  conversation = await Conversation.findById(conversation._id)
    .populate({
      path: 'participants',
      select: 'name photo'
    });

  res.status(200).json({
    status: 'success',
    data: { conversation }
  });
});

// ─── Send Message ────────────────────────────────────────────────
exports.sendMessage = catchAsync(async (req, res, next) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return next(new AppError('Message cannot be empty.', 400));
  }

  const conversation = await Conversation.findById(req.params.conversationId);

  if (!conversation) {
    return next(new AppError('No conversation found.', 404));
  }

  // Verify sender is a participant
  const isParticipant = conversation.participants.some(
    p => (p._id ? p._id.toString() : p.toString()) === req.user.id
  );

  if (!isParticipant) {
    return next(new AppError('You are not a participant in this conversation.', 403));
  }

  conversation.messages.push({
    sender: req.user.id,
    text: text.trim()
  });

  await conversation.save();

  res.status(201).json({
    status: 'success',
    data: {
      message: conversation.messages[conversation.messages.length - 1]
    }
  });
});

// ─── Get My Conversations ────────────────────────────────────────
exports.getMyConversations = catchAsync(async (req, res, next) => {
  const conversations = await Conversation.find({
    participants: req.user.id
  })
    .populate({
      path: 'participants',
      select: 'name photo'
    })
    .populate({
      path: 'booking',
      select: 'place startDate status'
    })
    .sort({ updatedAt: -1 });

  res.status(200).json({
    status: 'success',
    results: conversations.length,
    data: { conversations }
  });
});

// ─── Mark Messages as Read ───────────────────────────────────────
exports.markAsRead = catchAsync(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);

  if (!conversation) {
    return next(new AppError('No conversation found.', 404));
  }

  const isParticipant = conversation.participants.some(
    p => (p._id ? p._id.toString() : p.toString()) === req.user.id
  );

  if (!isParticipant) {
    return next(new AppError('You are not a participant in this conversation.', 403));
  }

  // Mark unread messages from the other person as read
  const now = new Date();
  conversation.messages.forEach(msg => {
    const senderId = msg.sender._id
      ? msg.sender._id.toString()
      : msg.sender.toString();
    if (senderId !== req.user.id && !msg.readAt) {
      msg.readAt = now;
    }
  });

  await conversation.save();

  res.status(200).json({
    status: 'success',
    message: 'Messages marked as read.'
  });
});
