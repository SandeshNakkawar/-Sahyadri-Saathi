const express = require('express');
const placeController = require('../controllers/placeController');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.get('/', placeController.getAllPlaces);
router.get('/featured', placeController.getFeaturedPlaces, placeController.getAllPlaces);
router.get('/slug/:slug', placeController.getPlaceBySlug);

// Admin-only routes
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.post(
  '/',
  placeController.uploadPlaceImages,
  placeController.resizePlaceImages,
  placeController.createPlace
);

router
  .route('/:id')
  .get(placeController.getPlace)
  .patch(
    placeController.uploadPlaceImages,
    placeController.resizePlaceImages,
    placeController.updatePlace
  )
  .delete(placeController.deletePlace);

module.exports = router;
