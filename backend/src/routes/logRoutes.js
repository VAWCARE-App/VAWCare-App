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
// This endpoint is intentionally public so client-side pageview pings do not
// require a Firebase ID token. The controller will still prefer client-supplied
// actor headers when present and will fall back to authenticated req.user if available.
router.post('/pageview', logController.recordPageView);

module.exports = router;
