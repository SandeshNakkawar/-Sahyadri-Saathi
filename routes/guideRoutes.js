const express = require('express');
const guideController = require('./../controllers/guideController');
const authController = require('./../controllers/authController');

const router = express.Router();

// All guide routes require authentication and guide/lead-guide role
router.use(authController.protect);
router.use(authController.restrictTo('guide', 'lead-guide'));

router.get('/my-trips', guideController.getMyTrips);
router.get('/trips/:id', guideController.getTripDetails);
router.get('/trips/:tourId/travelers', guideController.getTravelerList);
router.patch('/trips/:id/notes', guideController.updateTripNotes);

module.exports = router;
