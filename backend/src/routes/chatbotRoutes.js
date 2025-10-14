const express = require('express');
const router = express.Router();
const { postMessage } = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');

// Protected (requires Firebase ID token)
router.post('/message', protect, postMessage);

// 🔓 Open (DEV ONLY) — no auth. Remove before production.
router.post('/open-message', postMessage);

module.exports = router;
