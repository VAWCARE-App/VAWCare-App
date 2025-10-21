const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const crypto = require('crypto');
const BPO = require('../models/BPO');
const fillBPOForm = require('../utils/fillBPOForm');

function buildIdQuery(id) {
    const or = [];
    if (mongoose.Types.ObjectId.isValid(id)) or.push({ _id: id });
    if (id) or.push({ bpoID: id });
    if (id) or.push({ controlNO: id });
    return { $or: or };
}

const createBPO = asyncHandler(async (req, res) => {
    const payload = req.body && req.body.data ? req.body.data : req.body;
    if (!payload || !payload.nameofRespondent) {
        return res.status(400).json({ success: false, message: 'nameofRespondent is required' });
    }
    const bpoID = payload.bpoID || `BPO-${crypto.randomBytes(6).toString('hex')}`;
    const doc = new BPO({ ...payload, bpoID });
    try {
        const saved = await doc.save();
        console.log('[createBPO] created', { _id: saved._id, bpoID: saved.bpoID });
        try {
            const { recordLog } = require('../middleware/logger');
            await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'bpo_saved', details: `Saved BPO ${saved.bpoID || saved._id}` });
        } catch (e) { console.warn('Failed to record BPO create log', e && e.message); }
        return res.status(201).json({ success: true, data: saved });
    } catch (err) {
        console.error('[createBPO] error', err && (err.message || err));
        if (err.code === 11000) return res.status(409).json({ success: false, message: 'Duplicate BPO id or controlNO' });
        return res.status(500).json({ success: false, message: 'Failed to create BPO', error: err.message });
    }
});

const listBPOs = asyncHandler(async (req, res) => {
    const { status, limit = 100, skip = 0 } = req.query;
    const q = { deleted: { $ne: true } };
    if (status) q.status = status;
    try {
        const docs = await BPO.find(q).sort({ createdAt: -1 }).limit(Number(limit)).skip(Number(skip)).lean();
        return res.json({ success: true, data: docs });
    } catch (err) {
        console.error('[listBPOs] error', err && err.message);
        return res.status(500).json({ success: false, message: 'Failed to list BPOs', error: err.message });
    }
});

const getBPO = asyncHandler(async (req, res) => {
    const id = (req.params.id || '').toString().trim();
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const q = { ...buildIdQuery(id), deleted: { $ne: true } };
    try {
        const doc = await BPO.findOne(q).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'BPO not found' });
    try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID || req.user?.victimID, action: 'view_bpo', details: `Viewed BPO ${doc.bpoID || doc._id}` }); } catch(e) { console.warn('Failed to record BPO view log', e && e.message); }
    return res.json({ success: true, data: doc });
    } catch (err) {
        console.error('[getBPO] error', err && err.message);
        return res.status(500).json({ success: false, message: 'Failed to get BPO', error: err.message });
    }
});

const updateBPO = asyncHandler(async (req, res) => {
    const id = (req.params.id || '').toString().trim();
    const payload = req.body && req.body.data ? req.body.data : req.body;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    if (!payload) return res.status(400).json({ success: false, message: 'Missing payload' });
    const allowed = ['status', 'copyReceivedBy', 'servedBy', 'dateReceived', 'punongBarangay', 'barangaykagawad', 'controlNO'];
    const updates = {};
    for (const k of allowed) if (Object.prototype.hasOwnProperty.call(payload, k)) updates[k] = payload[k];
    if (Object.keys(updates).length === 0) return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    const q = { ...buildIdQuery(id), deleted: { $ne: true } };
    try {
        const updated = await BPO.findOneAndUpdate(q, { $set: updates }, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ success: false, message: 'BPO not found or deleted' });
        console.log('[updateBPO] updated', { _id: updated._id, bpoID: updated.bpoID });
    try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'bpo_edited', details: `Edited BPO ${updated.bpoID || updated._id}: ${JSON.stringify(updates)}` }); } catch(e) { console.warn('Failed to record BPO edit log', e && e.message); }
    return res.json({ success: true, data: updated });
    } catch (err) {
        console.error('[updateBPO] error', err && err.message);
        return res.status(500).json({ success: false, message: 'Failed to update BPO', error: err.message });
    }
});

const deleteBPO = asyncHandler(async (req, res) => {
    const id = (req.params.id || '').toString().trim();
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const q = { ...buildIdQuery(id), deleted: { $ne: true } };
    try {
        console.log('[deleteBPO] attempting delete for id=', id, 'query=', JSON.stringify(q));
        const updated = await BPO.findOneAndUpdate(q, { $set: { deleted: true, deletedAt: new Date() } }, { new: true });
        if (!updated) {
            console.log('[deleteBPO] nothing matched for id=', id);
            return res.status(404).json({ success: false, message: 'BPO not found or already deleted' });
        }
        console.log('[deleteBPO] soft-deleted', { _id: updated._id, bpoID: updated.bpoID });
        try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'bpo_deleted', details: `Deleted BPO ${updated.bpoID || updated._id}` }); } catch(e) { console.warn('Failed to record BPO delete log', e && e.message); }
        return res.json({ success: true, data: updated });
    } catch (err) {
        console.error('[deleteBPO] error', err && err.stack);
        return res.status(500).json({ success: false, message: 'Failed to delete BPO', error: err.message });
    }
});

const generateBpoPdf = async (req, res) => {
  try {
    const bpoId = String(req.params.id || 'BPO'); // ensure string
    const pdfBytes = await fillBPOForm(bpoId);   // returns bytes

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${bpoId}.pdf"`);
    res.send(Buffer.from(pdfBytes));             // send the PDF directly
  } catch (error) {
    console.error('Error generating BPO PDF:', error);
    res.status(500).json({ message: 'Error generating BPO PDF', error: error.message });
  }
};


module.exports = { createBPO, listBPOs, getBPO, updateBPO, deleteBPO, generateBpoPdf };
