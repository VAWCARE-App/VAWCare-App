const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// List logs with optional filters
router.get('/', protect, adminOnly, logController.listLogs);

// Get single log
router.get('/:id', protect, adminOnly, logController.getLog);

// Actor-specific endpoints
router.get('/victim/:victimId', protect, adminOnly, logController.getVictimLogs);
router.get('/admin/:adminId', protect, adminOnly, logController.getAdminLogs);
router.get('/official/:officialId', protect, adminOnly, logController.getOfficialLogs);

// Record a page view (called by frontend when opening pages)
router.post('/pageview', protect, logController.recordPageView);

module.exports = router;
