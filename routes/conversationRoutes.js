const express = require('express');
const conversationController = require('../controllers/conversationController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Get or create conversation for a booking
router.get(
  '/booking/:bookingId',
  authController.restrictTo('tourist', 'guide'),
  conversationController.getOrCreateConversation
);

// Get my conversations
router.get(
  '/me',
  authController.restrictTo('tourist', 'guide'),
  conversationController.getMyConversations
);

// Send message
router.post(
  '/:conversationId/message',
  authController.restrictTo('tourist', 'guide'),
  conversationController.sendMessage
);

// Mark as read
router.patch(
  '/:conversationId/read',
  authController.restrictTo('tourist', 'guide'),
  conversationController.markAsRead
);

module.exports = router;
