const express = require('express');
const router = express.Router();
const dssController = require('../controllers/dssController');

// Public suggestion endpoint: POST /api/dss/suggest
router.post('/suggest', dssController.suggest);
// Suggestions for insights pages
router.post('/suggest/cases', dssController.suggestCasesInsights);
router.post('/suggest/reports', dssController.suggestReportsInsights);
router.post('/suggest/alerts', dssController.suggestAlertsInsights);

// Test rules engine without running model: POST /api/dss/test
router.post('/test', dssController.testRules);

// Admin-only (or developer) training endpoint
router.post('/train', dssController.trainModel);
// Return cancellation counts for a victim or incidentType: GET /api/dss/cancellations?victimId=... or ?incidentType=...
router.get('/cancellations', dssController.cancellations);

module.exports = router;
