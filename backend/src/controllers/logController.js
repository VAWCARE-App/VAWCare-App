const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const SystemLog = require('../models/SystemLogs');
const Victim = require('../models/Victims');
const Admin = require('../models/Admin');
const Official = require('../models/BarangayOfficials');

// @desc    List system logs with optional filters (action, actor, date range, ip)
// @route   GET /api/logs
// @access  Private (Admin only)
exports.listLogs = asyncHandler(async (req, res) => {
    const { action, actorType, actorId, startDate, endDate, ipAddress, page = 1, limit = 50 } = req.query;

    const query = {};

    if (action) query.action = action;
    if (ipAddress) query.ipAddress = ipAddress;

    if (actorType) {
        // If actorId not supplied, filter for logs where the relevant actor field exists
        if (!actorId) {
            if (actorType === 'victim') query.victimID = { $exists: true };
            else if (actorType === 'admin') query.adminID = { $exists: true };
            else if (actorType === 'official') query.officialID = { $exists: true };
        } else {
            // actorId from the frontend may be a business id and  SystemLog stores ObjectId references. 
            let resolvedId = actorId;
            const looksLikeObjectId = mongoose.Types.ObjectId.isValid(actorId);

            if (!looksLikeObjectId) {
                if (actorType === 'victim') {
                    const v = await Victim.findOne({ victimID: actorId }).select('_id').lean();
                    resolvedId = v ? v._id : null;
                } else if (actorType === 'admin') {
                    const a = await Admin.findOne({ adminID: actorId }).select('_id').lean();
                    resolvedId = a ? a._id : null;
                } else if (actorType === 'official') {
                    const o = await Official.findOne({ officialID: actorId }).select('_id').lean();
                    resolvedId = o ? o._id : null;
                }
            }

            // If we couldn't resolve the supplied actorId to a DB record, return empty result
            if (!resolvedId) {
                return res.status(200).json({ success: true, data: [], total: 0, page: Number(page), limit: Number(limit) });
            }

            if (actorType === 'victim') query.victimID = resolvedId;
            else if (actorType === 'admin') query.adminID = resolvedId;
            else if (actorType === 'official') query.officialID = resolvedId;
        }
    }

    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [items, total] = await Promise.all([
        SystemLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate('victimID', '-victimPassword')
            .populate('adminID', '-adminPassword')
            .populate('officialID', '-officialPassword')
            .lean(),
        SystemLog.countDocuments(query)
    ]);

    res.status(200).json({ success: true, data: items, total, page: Number(page), limit: Number(limit) });
});

// @desc    Get single log by id
// @route   GET /api/logs/:id
// @access  Private (Admin only)
exports.getLog = asyncHandler(async (req, res) => {
    const log = await SystemLog.findById(req.params.id)
        .populate('victimID', '-victimPassword')
        .populate('adminID', '-adminPassword')
        .populate('officialID', '-officialPassword')
        .lean();

    if (!log) {
        res.status(404);
        throw new Error('Log not found');
    }

    res.status(200).json({ success: true, data: log });
});

// @desc    Get logs for a victim
// @route   GET /api/logs/victim/:victimId
// @access  Private (Admin only)
exports.getVictimLogs = asyncHandler(async (req, res) => {
    const idParam = req.params.victimId;
    let resolved = idParam;
    if (!mongoose.Types.ObjectId.isValid(idParam)) {
        const v = await Victim.findOne({ victimID: idParam }).select('_id').lean();
        resolved = v ? v._id : null;
    }

    if (!resolved) return res.status(200).json({ success: true, data: [] });

    const items = await SystemLog.find({ victimID: resolved })
        .sort({ timestamp: -1 })
        .populate('victimID', '-victimPassword')
        .populate('adminID', '-adminPassword')
        .populate('officialID', '-officialPassword')
        .lean();

    res.status(200).json({ success: true, data: items });
});

// @desc    Get logs for an admin
// @route   GET /api/logs/admin/:adminId
// @access  Private (Admin only)
exports.getAdminLogs = asyncHandler(async (req, res) => {
    const idParam = req.params.adminId;
    let resolved = idParam;
    if (!mongoose.Types.ObjectId.isValid(idParam)) {
        const a = await Admin.findOne({ adminID: idParam }).select('_id').lean();
        resolved = a ? a._id : null;
    }

    if (!resolved) return res.status(200).json({ success: true, data: [] });

    const items = await SystemLog.find({ adminID: resolved })
        .sort({ timestamp: -1 })
        .populate('victimID', '-victimPassword')
        .populate('adminID', '-adminPassword')
        .populate('officialID', '-officialPassword')
        .lean();

    res.status(200).json({ success: true, data: items });
});

// @desc    Get logs for a barangay official
// @route   GET /api/logs/official/:officialId
// @access  Private (Admin only)
exports.getOfficialLogs = asyncHandler(async (req, res) => {
    const idParam = req.params.officialId;
    let resolved = idParam;
    if (!mongoose.Types.ObjectId.isValid(idParam)) {
        const o = await Official.findOne({ officialID: idParam }).select('_id').lean();
        resolved = o ? o._id : null;
    }

    if (!resolved) return res.status(200).json({ success: true, data: [] });

    const items = await SystemLog.find({ officialID: resolved })
        .sort({ timestamp: -1 })
        .populate('victimID', '-victimPassword')
        .populate('adminID', '-adminPassword')
        .populate('officialID', '-officialPassword')
        .lean();

    res.status(200).json({ success: true, data: items });
});

// @desc    Record a page view (frontend can call this when a page is opened)
// @route   POST /api/logs/pageview
// @access  Private
exports.recordPageView = asyncHandler(async (req, res) => {
    const { path } = req.body;
    try {
        const { recordLog } = require('../middleware/logger');
        // Prefer client-supplied actor info (from localStorage).
    let actorType = req.body?.actorType || req.query?.actorType || req.headers?.['x-actor-type'] || req.user?.role || 'anonymous';
    let actorId = req.body?.actorId || req.query?.actorId || req.headers?.['x-actor-id'] || req.user?.adminID || req.user?.officialID || req.user?.victimID || null;
    // If a business id (ADM001 etc.) was supplied, include it in details for traceability
    const actorBusinessId = req.body?.actorBusinessId || req.query?.actorBusinessId || req.headers?.['x-actor-business-id'] || null;
    const details = `Opened page ${path || req.originalUrl}` + (actorBusinessId ? ` by ${actorBusinessId}` : '');
    await recordLog({ req, actorType, actorId, actorBusinessId, action: 'page_view', details });
    } catch (e) {
        console.warn('Failed to record page view', e && e.message);
    }
    res.status(200).json({ success: true });
});
