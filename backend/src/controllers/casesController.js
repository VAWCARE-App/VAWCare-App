const Cases = require('../models/Cases');
const mongoose = require('mongoose');
const reportService = require('../services/reportService');
const Victim = require('../models/Victims');

exports.createCase = async (req, res, next) => {
  try {
    const payload = { ...(req.body || {}) };

    // If victimName wasn't provided by the client, try to resolve it from the report or victim record
    if (!payload.victimName || String(payload.victimName).trim() === '') {
      try {
        // Try to enrich from report if reportID present
        if (payload.reportID) {
          const report = await reportService.getReportById(payload.reportID);
          if (report && report.victimID) {
            const v = report.victimID;
            const parts = [v.firstName, v.middleInitial, v.lastName].filter(Boolean);
            // middleInitial may be a single char; keep as-is
            payload.victimName = parts.length ? parts.join(' ').trim() : (v.victimID || '');
          }
        }

        // If still missing, try to resolve from victimID field
        if ((!payload.victimName || payload.victimName.trim() === '') && payload.victimID) {
          // payload.victimID may be an ObjectId string or business id
          let v;
          if (mongoose.Types.ObjectId.isValid(payload.victimID)) {
            v = await Victim.findById(payload.victimID).lean();
          }
          if (!v) v = await Victim.findOne({ victimID: payload.victimID }).lean();
          if (v) {
            const parts = [v.firstName, v.middleInitial, v.lastName].filter(Boolean);
            payload.victimName = parts.length ? parts.join(' ').trim() : (v.victimID || '');
          }
        }
      } catch (e) {
        // non-fatal: continue and fallback below
        console.warn('Failed to enrich victimName for case creation', e?.message || e);
      }

      // Final fallback: if still missing, use victimID or a safe default to satisfy model
      if (!payload.victimName || payload.victimName.trim() === '') {
        payload.victimName = (payload.victimID && String(payload.victimID)) || 'Anonymous';
      }
    }

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