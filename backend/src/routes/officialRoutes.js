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
router.get('/profile/photo', protect, officialController.getProfilePhoto);
router.put('/profile', protect, officialController.updateProfile);

// Protected routes for victim management
router.get('/victims', protect, requireEmailVerification, officialController.getAllVictims);

module.exports = router;
