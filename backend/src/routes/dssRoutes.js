const express = require('express');
const router = express.Router();
const dssController = require('../controllers/dssController');

// Public suggestion endpoint: POST /api/dss/suggest
router.post('/suggest', dssController.suggest);

// Test rules engine without running model: POST /api/dss/test
router.post('/test', dssController.testRules);

// Admin-only (or developer) training endpoint
router.post('/train', dssController.trainModel);

module.exports = router;
