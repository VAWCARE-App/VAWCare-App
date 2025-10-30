const mongoose = require('mongoose');

const PhotoSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  ownerModel: { type: String, default: 'Victim' },
  image: { type: String, required: true },
  thumbnail: { type: String },
  mimeType: { type: String, default: 'image/jpeg' },
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

module.exports = mongoose.model('Photos', PhotoSchema);
