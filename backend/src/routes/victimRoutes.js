const express = require('express');
const router = express.Router();
const victimController = require('../controllers/victimController');
const { protect } = require('../middleware/authMiddleware');
const { requirePhoneVerification, requireEmailVerification } = require('../middleware/securityMiddleware');

// Public routes (no authentication required)
router.post('/register', victimController.registerVictim);
router.post('/login', victimController.loginVictim);

// Anonymous reporting routes
router.post('/anonymous/report', victimController.submitAnonymousReport);
router.post('/anonymous/alert', victimController.sendAnonymousAlert);

// Authentication verification routes
router.post('/verify-email', protect, victimController.verifyEmail);
router.post('/verify-phone', protect, victimController.verifyPhone);

// Protected routes (require authentication)
router.get('/profile', protect, victimController.getProfile);
router.put('/profile', protect, requireEmailVerification, victimController.updateProfile);

// Routes requiring email verification
router.get('/reports', protect, requireEmailVerification, victimController.getReports);
router.put('/reports/:id', protect, requireEmailVerification, victimController.updateReport);

// Sensitive operations with optional anonymous access
router.post('/report', (req, res, next) => {
    if (req.query.anonymous === 'true') {
        victimController.submitAnonymousReport(req, res, next);
    } else {
        protect(req, res, () => {
            requireEmailVerification(req, res, () => {
                requirePhoneVerification(req, res, () => {
                    victimController.submitReport(req, res, next);
                });
            });
        });
    }
});

module.exports = router;