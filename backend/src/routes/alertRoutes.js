const express = require('express');
const router = express.Router();
const { resolveAlert } = require('../controllers/alertController');

// Resolve alert (set status to Resolved)
router.put('/:id/resolve', resolveAlert);

module.exports = router;
