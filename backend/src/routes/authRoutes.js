const express = require('express');
const router = express.Router();
const { logout, sendOTP, verifyOTP, resetPassword, me } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Allow clients to call this on logout to record a logout event
router.post('/logout', protect, logout);

// Password reset routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.get('/me', protect, me);

module.exports = router;
