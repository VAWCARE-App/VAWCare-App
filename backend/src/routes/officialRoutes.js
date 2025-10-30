const express = require('express');
const router = express.Router();
const officialController = require('../controllers/officialController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { requirePhoneVerification, requireEmailVerification } = require('../middleware/securityMiddleware');

// Auth routes
router.post('/register', officialController.registerOfficial); // Anyone can register, but starts as pending
router.post('/login', officialController.loginOfficial);
router.post('/forgot-password', officialController.sendPasswordResetEmail); // Firebase password reset
router.post('/verify-email', protect, officialController.verifyEmail);
router.post('/verify-phone', protect, officialController.verifyPhone);

// Protected routes requiring email verification
router.get('/profile', protect, officialController.getProfile);
router.put('/profile', protect, officialController.updateProfile);
// Photo endpoints for official profiles (base64/multipart)
router.post('/profile/photo', protect, officialController.uploadPhoto);
router.get('/profile/photo', protect, officialController.getPhoto);
router.get('/profile/photo/raw', protect, officialController.getPhotoRaw);
router.get('/profile/photo/thumbnail', protect, officialController.getPhotoThumbnail);

// Protected routes for victim management
router.get('/victims', protect, requireEmailVerification, officialController.getAllVictims);

module.exports = router;
