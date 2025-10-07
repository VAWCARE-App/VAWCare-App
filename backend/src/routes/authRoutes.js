const express = require('express');
const router = express.Router();
const { logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Allow clients to call this on logout to record a logout event
router.post('/logout', protect, logout);

module.exports = router;
