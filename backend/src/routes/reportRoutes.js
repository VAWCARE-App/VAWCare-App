const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Victims and officials (may be anonymous or authenticated) can create reports — no admin permission required
router.post('/', reportController.createReport);

// List reports 
router.get('/', reportController.listReports);

// Get single report by reportID (path param 'id').
router.get('/:id', /* protect, */ reportController.getReport);

// Update report (status) - temporarily unprotected for testing
// router.put('/:id', protect, reportController.updateReport);
router.put('/:id', /* protect, */ reportController.updateReport);

// Soft-delete report 
router.delete('/:id',/* protect, */ reportController.deleteReport);

module.exports = router;
