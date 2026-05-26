const express = require('express');
const guideBookingController = require('../controllers/guideBookingController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public: blocked dates for a guide (no auth needed — tourists browse availability)
router.get(
  '/guide/:guideProfileId/blocked-dates',
  guideBookingController.getGuideBlockedDates
);

router.use(authController.protect);

// Tourist routes
router.post(
  '/',
  authController.restrictTo('tourist'),
  guideBookingController.createBookingRequest
);

router.get(
  '/my-bookings',
  authController.restrictTo('tourist'),
  guideBookingController.getMyBookings
);

router.patch(
  '/:id/tourist-confirm-complete',
  authController.restrictTo('tourist'),
  guideBookingController.touristConfirmComplete
);

// Guide routes
router.get(
  '/guide-requests',
  authController.restrictTo('guide'),
  guideBookingController.getGuideRequests
);

router.get(
  '/guide/my-requests',
  authController.restrictTo('guide'),
  guideBookingController.getGuideRequests
);

router.patch(
  '/:id/accept',
  authController.restrictTo('guide'),
  guideBookingController.acceptBooking
);

router.patch(
  '/:id/reject',
  authController.restrictTo('guide'),
  guideBookingController.rejectBooking
);

router.patch(
  '/:id/guide-complete',
  authController.restrictTo('guide'),
  guideBookingController.guideMarkComplete
);

router.patch(
  '/:id/guide-mark-complete',
  authController.restrictTo('guide'),
  guideBookingController.guideMarkComplete
);

// Shared routes
router.patch(
  '/:id/cancel',
  authController.restrictTo('tourist', 'admin'),
  guideBookingController.cancelBooking
);

router.patch(
  '/:id/start',
  authController.restrictTo('guide', 'admin'),
  guideBookingController.startTrip
);

router.patch(
  '/:id/start-trip',
  authController.restrictTo('guide', 'admin'),
  guideBookingController.startTrip
);

router.get(
  '/:id',
  guideBookingController.getBooking
);

// Admin routes
router.get(
  '/',
  authController.restrictTo('admin'),
  guideBookingController.getAllBookings
);

module.exports = router;
