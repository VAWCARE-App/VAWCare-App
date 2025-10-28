const express = require('express');
const router = express.Router();
const victimController = require('../controllers/victimController');
const { protect } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.post('/register', victimController.registerVictim);
router.post('/login', victimController.loginVictim);

// Anonymous reporting routes
router.post('/anonymous/report', victimController.submitAnonymousReport);
router.post('/anonymous/alert', victimController.sendAnonymousAlert);

// Protected routes (require authentication)
router.get('/profile', protect, victimController.getProfile);
router.get('/profile/photo', protect, victimController.getProfilePhoto);
router.put('/profile', protect, victimController.updateProfile);

// Victim-specific metrics and reports
router.get('/metrics', protect, victimController.getMetrics);

// Authentication verification routes
router.post('/verify-email', protect, victimController.verifyEmail);
router.post('/verify-phone', protect, victimController.verifyPhone);

// Report management routes (victims can only access their own reports)
router.get('/reports', protect, victimController.getReports);
router.put('/reports/:id', protect, victimController.updateReport);

module.exports = router;