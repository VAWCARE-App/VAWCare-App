const Cases = require('../models/Cases');
const mongoose = require('mongoose');

exports.createCase = async (req, res, next) => {
  try {
    const payload = req.body;
    const created = await Cases.create(payload);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

exports.listCases = async (req, res, next) => {
  try {
    // Exclude soft-deleted cases by default
    const items = await Cases.find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

exports.getCase = async (req, res, next) => {
  try {
    const id = req.params.id;
    // Build query safely: only include _id branch when id looks like a valid ObjectId
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ caseID: id }, { _id: id }], deleted: { $ne: true } }
      : { caseID: id, deleted: { $ne: true } };
    const item = await Cases.findOne(query).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Case not found or deleted' });
    return res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

exports.updateCase = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ caseID: id }, { _id: id }], deleted: { $ne: true } }
      : { caseID: id, deleted: { $ne: true } };
    const item = await Cases.findOneAndUpdate(query, updates, { new: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Case not found or deleted' });
    return res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

exports.deleteCase = async (req, res, next) => {
  try {
    const id = req.params.id;
    // Soft delete: mark as deleted and set deletedAt
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ caseID: id }, { _id: id }], deleted: { $ne: true } }
      : { caseID: id, deleted: { $ne: true } };
    const item = await Cases.findOneAndUpdate(query, { deleted: true, deletedAt: new Date() }, { new: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Case not found or already deleted' });
    return res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};