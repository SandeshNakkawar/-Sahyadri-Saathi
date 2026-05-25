const express = require('express');
const payoutRequestController = require('../controllers/payoutRequestController');
const authController = require('../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// Guide routes
router.post(
  '/:bookingId',
  authController.restrictTo('guide'),
  payoutRequestController.createPayoutRequest
);

router.get(
  '/me',
  authController.restrictTo('guide'),
  payoutRequestController.getMyPayoutRequests
);

router.get(
  '/my-payouts',
  authController.restrictTo('guide'),
  payoutRequestController.getMyPayoutRequests
);

// Admin routes
router.get(
  '/admin',
  authController.restrictTo('admin'),
  payoutRequestController.getAdminPayoutRequests
);

router.patch(
  '/:id/mark-paid',
  authController.restrictTo('admin'),
  payoutRequestController.markPaid
);

router.patch(
  '/:id/hold',
  authController.restrictTo('admin'),
  payoutRequestController.holdPayout
);

router.patch(
  '/:id/reject',
  authController.restrictTo('admin'),
  payoutRequestController.rejectPayout
);

module.exports = router;
