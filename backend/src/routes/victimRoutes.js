const express = require('express');
const router = express.Router();
const victimController = require('../controllers/victimController');
const { protect } = require('../middleware/authMiddleware');

// Auth routes
router.post('/register', victimController.registerVictim);
router.post('/login', victimController.loginVictim);

// Protected routes
router.get('/profile', protect, victimController.getProfile);

module.exports = router;