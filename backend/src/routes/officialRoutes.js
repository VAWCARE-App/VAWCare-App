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

// Routes requiring both email and phone verification
router.get('/reports', protect, requireEmailVerification, requirePhoneVerification, officialController.getReports);
router.put('/reports/:id', protect, requireEmailVerification, requirePhoneVerification, officialController.updateReport);
router.post('/respond', protect, requireEmailVerification, requirePhoneVerification, officialController.respondToAlert);

module.exports = router;
