const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('tourist'),
    reviewController.setGuideUserIds,
    reviewController.verifyCompletedBooking,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('tourist', 'admin'),
    reviewController.verifyOwnership,
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('tourist', 'admin'),
    reviewController.verifyOwnership,
    reviewController.deleteReview
  );

module.exports = router;
