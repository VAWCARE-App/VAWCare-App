const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc    Get all notifications (newest first)
// @route   GET /api/notifications
// @access  Private or Public depending on your auth
const getNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({})
        .sort({ createdAt: -1 })
        .lean();
    res.json({ success: true, data: notifications });
});

// @desc    Delete a notification by ID
// @route   DELETE /api/notifications/:id
// @access  Private or Public depending on your auth
const deleteNotification = asyncHandler(async (req, res) => {
    const notif = await Notification.findById(req.params.id);
    if (!notif) {
        res.status(404);
        throw new Error('Notification not found');
    }

    await notif.deleteOne();
    res.json({ success: true, message: 'Notification deleted' });
});

module.exports = {
    getNotifications,
    deleteNotification,
};
