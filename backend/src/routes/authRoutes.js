const express = require('express');
const router = express.Router();
const { logout, sendOTP, verifyOTP, resetPassword, me, setToken, getUserData } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Allow clients to call this on logout to record a logout event
router.post('/logout', protect, logout);

// Token exchange endpoint - frontend calls this after exchanging custom token for ID token
router.post('/set-token', setToken);

// User data retrieval endpoint - frontend calls this to fetch user metadata from secure cookie
router.get('/user-data', getUserData);

// Password reset routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.get('/me', protect, me);

module.exports = router;
