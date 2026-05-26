const express = require('express');
const guideProfileController = require('../controllers/guideProfileController');
const authController = require('../controllers/authController');

const router = express.Router();

// Specific routes — must be defined BEFORE wildcards to prevent capture
router.get(
  '/profile/me',
  authController.protect,
  authController.restrictTo('guide'),
  guideProfileController.getMyProfile
);

router.get(
  '/me',
  authController.protect,
  authController.restrictTo('guide'),
  guideProfileController.getMyProfile
);

// Public routes — approved guides only
router.get('/', guideProfileController.getPublicGuides);

// Public: Price preview (no auth — tourists browse pricing before login)
router.get('/:id/price-preview', guideProfileController.getPricePreview);

// Protected routes — require login
router.use(authController.protect);

router.post(
  '/onboarding',
  authController.restrictTo('guide'),
  guideProfileController.uploadProfilePhoto,
  guideProfileController.resizeProfilePhoto,
  guideProfileController.createOrUpdateProfile
);

router.patch(
  '/profile/me',
  authController.restrictTo('guide'),
  guideProfileController.uploadProfilePhoto,
  guideProfileController.resizeProfilePhoto,
  guideProfileController.createOrUpdateProfile
);

router.patch(
  '/me',
  authController.restrictTo('guide'),
  guideProfileController.uploadProfilePhoto,
  guideProfileController.resizeProfilePhoto,
  guideProfileController.createOrUpdateProfile
);

router.post(
  '/submit-verification',
  authController.restrictTo('guide'),
  guideProfileController.uploadVerificationDocs,
  guideProfileController.saveVerificationDocs,
  guideProfileController.createOrUpdateProfile,
  guideProfileController.submitVerification
);

// Admin-only routes — MUST be before /:id wildcard to prevent 'admin' from being captured as an ID
router.get(
  '/admin/pending',
  authController.restrictTo('admin'),
  guideProfileController.getPendingGuides
);

router.get(
  '/admin/all',
  authController.restrictTo('admin'),
  guideProfileController.getAllGuides
);

router.patch(
  '/admin/:id/approve',
  authController.restrictTo('admin'),
  guideProfileController.approveGuide
);

router.patch(
  '/admin/:id/reject',
  authController.restrictTo('admin'),
  guideProfileController.rejectGuide
);

router.patch(
  '/admin/:id/suspend',
  authController.restrictTo('admin'),
  guideProfileController.suspendGuide
);

// Document access (guide or admin) — uses :guideId so no conflict
router.get(
  '/:guideId/documents/:docType',
  authController.restrictTo('guide', 'admin'),
  guideProfileController.getDocument
);

// Wildcard route — MUST be LAST to avoid capturing specific routes like /admin/pending
router.get('/:id', guideProfileController.getGuideById);

module.exports = router;
