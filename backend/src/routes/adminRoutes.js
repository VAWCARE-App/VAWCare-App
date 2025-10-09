const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly, backendAdminOnly } = require('../middleware/authMiddleware');
const { requireMultiFactorAuth, requirePhoneVerification, requireEmailVerification } = require('../middleware/securityMiddleware');

// Auth routes
router.post('/register', adminController.registerAdmin); // Removed auth middleware for first admin
router.post('/login', adminController.loginAdmin);
router.post('/forgot-password', adminController.requestPasswordReset);
router.post('/reset-password', adminController.resetAdminPassword);

// MFA setup routes
router.post('/setup-mfa', protect, adminOnly, adminController.setupMFA);
router.post('/verify-mfa', protect, adminOnly, adminController.verifyMFA);

// Profile routes for the currently authenticated admin
router.get('/profile', protect, adminOnly, adminController.getProfile);
router.put('/profile', protect, adminOnly, adminController.updateProfile);

// Get all users route
router.get('/users', /*protect, adminOnly,*/ adminController.getAllUsers);

// Admin management routes (backend admin only)
router.get('/admins', /*protect, backendAdminOnly, requireEmailVerification,*/ adminController.getAllAdmins);
router.put('/admins/soft-delete/:id', /*protect, backendAdminOnly,*/ requireEmailVerification, requirePhoneVerification, requireMultiFactorAuth, adminController.softDeleteAdmin);
router.delete('/admins/:id', /*protect, backendAdminOnly,*/ requireEmailVerification, requirePhoneVerification, requireMultiFactorAuth, adminController.hardDeleteAdmin);
router.put('/admins/:id', /*protect, backendAdminOnly,*/ adminController.updateAdmin);
router.put('/admins/restore/:id', /*protect, backendAdminOnly,*/ requireEmailVerification, requirePhoneVerification, requireMultiFactorAuth, adminController.restoreAdmin);

// Victim management routes (backend admin only)
router.get('/victims', /*protect, backendAdminOnly,*/ adminController.getAllVictims);
router.post('/victims/register', /*protect, backendAdminOnly,*/ adminController.registerVictim);
router.put('/victims/:id', /*protect, backendAdminOnly,*/ adminController.updateVictim);
router.put('/victims/soft-delete/:id', /*protect, backendAdminOnly,*/ adminController.softDeleteVictim);
router.put('/victims/restore/:id', /*protect, backendAdminOnly,*/ adminController.restoreVictim);
router.delete('/victims/:id', /*protect, backendAdminOnly,*/ adminController.hardDeleteVictim);

// Barangay Official management routes (backend admin only)
router.get('/officials', /*protect, backendAdminOnly,*/ adminController.getAllOfficials);
router.post('/officials/register', /*protect, backendAdminOnly,*/ adminController.registerOfficial);
router.put('/officials/:id', /*protect, backendAdminOnly,*/ adminController.updateOfficial);
router.put('/officials/soft-delete/:id', /*protect, backendAdminOnly,*/ adminController.softDeleteOfficial);
router.put('/officials/restore/:id', /*protect, backendAdminOnly,*/ adminController.restoreOfficial);
router.delete('/officials/:id', /*protect, backendAdminOnly,*/ adminController.hardDeleteOfficial);
router.put('/officials/:id/status', /*protect, backendAdminOnly,*/ adminController.updateOfficialStatus);

module.exports = router;