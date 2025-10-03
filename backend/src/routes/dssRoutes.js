const express = require('express');
const router = express.Router();
const dssController = require('../controllers/dssController');

// Public suggestion endpoint: POST /api/dss/suggest
router.post('/suggest', dssController.suggest);

// Admin-only (or developer) training endpoint
router.post('/train', dssController.trainModel);

module.exports = router;
