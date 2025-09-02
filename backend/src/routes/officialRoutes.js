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
router.get('/profile', protect, requireEmailVerification, officialController.getProfile);
router.put('/profile', protect, requireEmailVerification, officialController.updateProfile);

module.exports = router;
