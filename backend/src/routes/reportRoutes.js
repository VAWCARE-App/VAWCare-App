const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Victims and officials (may be anonymous or authenticated) can create reports — no admin permission required
router.post('/', reportController.createReport);

// List reports (was protected) - query params: status, victimID
// Commented out authentication/authorization for testing; restore protect + authorizeRoles in production.
// Only admins and barangay officials should list all incident reports in production.
// router.get('/', protect, authorizeRoles(['admin', 'barangay_official']), reportController.listReports);
router.get('/', reportController.listReports);

// Get single report by reportID (path param 'id').
// In production this should be protected according to your auth rules.
router.get('/:id', /* protect, */ reportController.getReport);

// Update report (status) - temporarily unprotected for testing
// router.put('/:id', protect, reportController.updateReport);
router.put('/:id', /* protect, */ reportController.updateReport);

module.exports = router;
