// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // "new-alert", "new-report", etc.
  refId: { type: mongoose.Schema.Types.ObjectId, refPath: "typeRef" }, 
  typeRef: { type: String, enum: ["Alert", "Report"] }, // dynamic ref
  message: { type: String, required: true },

  isRead: { type: Boolean, default: false }, // mark as read in UI
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
