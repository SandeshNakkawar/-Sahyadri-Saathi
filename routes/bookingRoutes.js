const express = require('express');
const bookingController = require('./../controllers/bookingController');
const authController = require('./../controllers/authController');

const router = express.Router();

router.use(authController.protect);

// User routes
router.get('/my-bookings', bookingController.getMyBookings);
router.get(
  '/checkout-session/:tourId',
  bookingController.getCheckoutSession
);
router.post(
  '/checkout-session/:tourId',
  bookingController.getCheckoutSession
);
router.get('/billing-portal', bookingController.getBillingPortal);
router.get(
  '/check-availability/:tourId/:startDateId',
  bookingController.checkAvailability
);

// Cancel booking (user can cancel their own, admin can cancel any)
router.post('/:id/cancel', bookingController.cancelBooking);

// Admin-only routes
router.use(authController.restrictTo('admin', 'lead-guide'));

router.patch('/:id/status', bookingController.updateBookingStatus);
router.patch('/:id/assign-guide', bookingController.assignGuide);
router.patch('/:id/details', bookingController.updateBookingDetails);
router.post('/:id/refund', bookingController.refundBooking);

router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .patch(bookingController.updateBooking)
  .delete(bookingController.deleteBooking);

module.exports = router;