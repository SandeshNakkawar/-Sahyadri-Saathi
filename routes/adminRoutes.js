const express = require('express');
const adminController = require('./../controllers/adminController');
const authController = require('./../controllers/authController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.get('/stats', adminController.getStats);
router.get('/revenue', adminController.getRevenue);
router.get('/bookings', adminController.getBookingsByStatus);
router.get('/bookings/recent', adminController.getRecentBookings);
router.get('/guides', adminController.getGuides);

module.exports = router;
