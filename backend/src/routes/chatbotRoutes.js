const express = require('express');
const router = express.Router();
const { postMessage } = require('../controllers/chatbotController');
const { protect } = require('../middleware/authMiddleware');

router.post('/message', protect, postMessage);

module.exports = router;
