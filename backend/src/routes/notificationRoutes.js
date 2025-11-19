const express = require('express');
const router = express.Router();
const { getNotifications, deleteNotification, clearAll } = require('../controllers/notificationController');

// Get all notifications
router.get('/', getNotifications);

// Delete a notification
router.delete('/:id', deleteNotification);

// Clear all notifications
router.delete('/clear-all', clearAll);

module.exports = router;
