const express = require('express');
const adminController = require('../controllers/adminController');
const authController = require('../controllers/authController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.get('/dashboard', adminController.getStats);
router.get('/revenue', adminController.getRevenue);
router.get('/users', adminController.getAllUsers);
router.get('/guides', adminController.getAllGuides);
router.get('/bookings', adminController.getAllBookings);
router.get('/payouts', adminController.getAllPayouts);
router.get('/reviews', adminController.getAllReviews);

module.exports = router;
