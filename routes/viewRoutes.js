const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/', authController.isLoggedIn, viewsController.getOverview);
router.get('/tours', authController.isLoggedIn, viewsController.getAllTours);
router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/about', viewsController.getAbout);
router.get('/contact', viewsController.getContact);
router.get('/careers', viewsController.getCareers);
router.get('/signup', authController.isLoggedIn, (req, res) => {
  res.status(200).render('signup', {
    title: 'Create your account'
  });
});

// ─── Protected user pages ────────────────────────────────────────
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-bookings', authController.protect, viewsController.getMyBookings);
router.get('/booking/:id', authController.protect, viewsController.getBookingDetail);
router.get('/billing', authController.protect, viewsController.getBilling);
router.get('/my-reviews', authController.protect, viewsController.getMyReviews);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

// ─── Admin pages ─────────────────────────────────────────────────
router.get(
  '/admin',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getAdminDashboard
);
router.get(
  '/admin/bookings',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getAdminBookings
);
router.get(
  '/admin/bookings/:id',
  authController.protect,
  authController.restrictTo('admin'),
  viewsController.getAdminBookingDetail
);

// ─── Guide pages ─────────────────────────────────────────────────
router.get(
  '/guide/trips',
  authController.protect,
  authController.restrictTo('guide', 'lead-guide'),
  viewsController.getGuideTrips
);
router.get(
  '/guide/trips/:id',
  authController.protect,
  authController.restrictTo('guide', 'lead-guide'),
  viewsController.getGuideTripDetail
);

module.exports = router;
