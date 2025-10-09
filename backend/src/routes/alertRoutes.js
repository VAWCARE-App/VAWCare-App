const express = require('express');
const router = express.Router();
const { resolveAlert, sendSOSEmail } = require('../controllers/alertController');

// Resolve alert (set status to Resolved)
router.put('/:id/resolve', resolveAlert);

// Send SOS email (when alert is clicked)
router.post('/:id/sos', sendSOSEmail);

// List alerts
router.get('/', require('../controllers/alertController').listAlerts);

module.exports = router;
