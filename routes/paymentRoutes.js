const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Tourist routes
router.post(
  '/create-checkout-session/:bookingId',
  authController.restrictTo('tourist'),
  paymentController.createCheckoutSession
);

router.get(
  '/my-payments',
  authController.restrictTo('tourist'),
  paymentController.getMyPayments
);

// Dev fallback for local testing
router.get(
  '/confirm-fallback',
  paymentController.confirmPaymentFallback
);

module.exports = router;
