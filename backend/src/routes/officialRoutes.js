const express = require('express');
const router = express.Router();
const officialController = require('../controllers/officialController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Auth routes
// Temporarily removed auth middleware
router.post('/register', protect, adminOnly, officialController.registerOfficial); // Only admin can register officials
router.post('/login', officialController.loginOfficial);

// Protected routes
router.get('/profile', protect, officialController.getProfile);
router.put('/profile', protect, officialController.updateProfile);

module.exports = router;
