const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly, backendAdminOnly } = require('../middleware/authMiddleware');
const { requireMultiFactorAuth, requirePhoneVerification, requireEmailVerification } = require('../middleware/securityMiddleware');

// Auth routes
router.post('/register', adminController.registerAdmin); // Removed auth middleware for first admin
router.post('/login', adminController.loginAdmin);

// MFA setup routes
router.post('/setup-mfa', protect, adminOnly, adminController.setupMFA);
router.post('/verify-mfa', protect, adminOnly, adminController.verifyMFA);

// Admin management routes (backend admin only)
router.get('/admins', protect, backendAdminOnly, requireEmailVerification, adminController.getAllAdmins);
router.put('/admins/soft-delete/:id', protect, backendAdminOnly, requireEmailVerification, requirePhoneVerification, requireMultiFactorAuth, adminController.softDeleteAdmin);
router.delete('/admins/:id', protect, backendAdminOnly, requireEmailVerification, requirePhoneVerification, requireMultiFactorAuth, adminController.hardDeleteAdmin);
router.put('/admins/restore/:id', protect, backendAdminOnly, requireEmailVerification, requirePhoneVerification, requireMultiFactorAuth, adminController.restoreAdmin);

// Victim management routes (backend admin only)
router.get('/victims', protect, backendAdminOnly, adminController.getAllVictims);
router.put('/victims/soft-delete/:id', protect, backendAdminOnly, adminController.softDeleteVictim);
router.delete('/victims/:id', protect, backendAdminOnly, adminController.hardDeleteVictim);

// Barangay Official management routes (backend admin only)
router.get('/officials', protect, backendAdminOnly, adminController.getAllOfficials);
router.put('/officials/soft-delete/:id', protect, backendAdminOnly, adminController.softDeleteOfficial);
router.delete('/officials/:id', protect, backendAdminOnly, adminController.hardDeleteOfficial);

module.exports = router;