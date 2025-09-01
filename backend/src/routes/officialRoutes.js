const express = require('express');
const router = express.Router();
const officialController = require('../controllers/officialController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { requirePhoneVerification, requireEmailVerification } = require('../middleware/securityMiddleware');

// Auth routes
router.post('/register', protect, adminOnly, officialController.registerOfficial); // Only admin can register officials
router.post('/login', officialController.loginOfficial);
router.post('/verify-email', protect, officialController.verifyEmail);
router.post('/verify-phone', protect, officialController.verifyPhone);

// Protected routes requiring email verification
router.get('/profile', protect, requireEmailVerification, officialController.getProfile);
router.put('/profile', protect, requireEmailVerification, officialController.updateProfile);

module.exports = router;
