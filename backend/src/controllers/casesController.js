const Cases = require('../models/Cases');
const mongoose = require('mongoose');
const reportService = require('../services/reportService');
const Victim = require('../models/Victims');
const dssService = require('../services/dssService');
const { recordLog } = require('../middleware/logger');

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

    // Always get DSS suggestions, whether riskLevel is provided or not
    try {
        const dssInput = {
          incidentType: payload.incidentType,
          description: payload.description,
          assignedOfficer: payload.assignedOfficer,
          status: payload.status,
          perpetrator: payload.perpetrator,
          victimId: payload.victimID || payload.victimId || null,
          victimType: payload.victimType || null,
          // Include riskLevel if it was manually provided
          ...(payload.riskLevel ? { riskLevel: payload.riskLevel } : {})
        };
  const dssRes = await dssService.suggestForCase(dssInput);
  console.log('DSS service response:', JSON.stringify(dssRes, null, 2));
        
        // If no riskLevel was provided, use DSS recommendation
        if (!payload.riskLevel && dssRes && dssRes.predictedRisk) {
          // Map 4-class predictedRisk to existing 3-level stored riskLevel
          const mapToStored = (pred) => {
            const p = (pred || '').toLowerCase();
            if (p === 'economic') return 'Low';
            if (p === 'psychological') return 'Medium';
            if (p === 'physical') return 'High';
            if (p === 'sexual') return 'High';
            // default
            return 'Low';
          };
          payload.riskLevel = mapToStored(dssRes.predictedRisk);
        }

        // Always populate DSS fields if we have a response
        if (dssRes) {
          // Map DSS response fields directly to schema fields
          payload.dssPredictedRisk = payload.incidentType; // Use incident type as predicted risk
          payload.dssStoredRisk = payload.riskLevel || dssRes.riskLevel || dssRes.dssStoredRisk;
          payload.dssProbabilities = Array.isArray(dssRes.dssProbabilities) ? dssRes.dssProbabilities : [];
          payload.dssImmediateAssistanceProbability = Number(dssRes.dssImmediateAssistanceProbability || 0);
          payload.dssSuggestion = dssRes.suggestion || dssRes.dssSuggestion || '';
          payload.dssRuleMatched = !!dssRes.dssRuleMatched;
          payload.dssChosenRule = dssRes.ruleDetails || dssRes.dssChosenRule || null;
          // Handle manual override - true if riskLevel was explicitly provided
          payload.dssManualOverride = typeof payload.riskLevel === 'string' && payload.riskLevel.trim() !== '';
        }
    } catch (e) {
      // Non-fatal: if DSS fails, continue with default riskLevel
      console.warn('DSS enrich failed during case creation', e?.message || e);
    }

    const created = await Cases.create(payload);
    // Log case creation/view as appropriate
    try {
      await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'view_case', details: `Created case ${created.caseID || created._id}` });
    } catch (e) { console.warn('Failed to record case create log', e && e.message); }
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
      try { await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID || req.user?.victimID, action: 'view_case', details: `Viewed case ${item.caseID || item._id}` }); } catch(e) { console.warn('Failed to record case view log', e && e.message); }
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
    // If a manual riskLevel is provided in updates, compute a DSS suggestion reflecting that override
    if (updates && updates.riskLevel) {
      try {
        // Fetch existing case to enrich input where updates don't provide fields
        const existing = await Cases.findOne(query).lean();
        if (existing) {
          const dssInput = {
            incidentType: updates.incidentType || existing.incidentType,
            description: updates.description || existing.description,
            assignedOfficer: updates.assignedOfficer || existing.assignedOfficer,
            status: updates.status || existing.status,
            perpetrator: updates.perpetrator || existing.perpetrator,
            victimId: updates.victimID || updates.victimId || existing.victimID || existing.victim || null,
            victimType: updates.victimType || existing.victimType || null,
            riskLevel: updates.riskLevel
          };
          const dssRes = await dssService.suggestForCase(dssInput, null);
          if (dssRes) {
            // merge DSS results into updates so they are persisted
            updates.dssPredictedRisk = dssRes.predictedRisk || dssRes.dssPredictedRisk;
            updates.dssStoredRisk = updates.riskLevel || dssRes.riskLevel || dssRes.dssStoredRisk;
            updates.dssProbabilities = Array.isArray(dssRes.dssProbabilities) ? dssRes.dssProbabilities : [];
            updates.dssImmediateAssistanceProbability = Number(dssRes.dssImmediateAssistanceProbability || 0);
            updates.dssSuggestion = dssRes.suggestion || dssRes.dssSuggestion || '';
            updates.dssRuleMatched = !!dssRes.dssRuleMatched;
            updates.dssChosenRule = dssRes.ruleDetails || dssRes.dssChosenRule || null;
            updates.dssManualOverride = typeof updates.riskLevel === 'string' && updates.riskLevel.trim() !== '';
          }
        }
      } catch (e) {
        console.warn('DSS enrich during update failed', e && e.message);
      }
    }

    const item = await Cases.findOneAndUpdate(query, updates, { new: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Case not found or deleted' });
    try { await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'edit_case', details: `Edited case ${item.caseID || item._id}: ${JSON.stringify(updates)}` }); } catch(e) { console.warn('Failed to record case edit log', e && e.message); }
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
      try { await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'delete_case', details: `Deleted case ${item.caseID || item._id}` }); } catch(e) { console.warn('Failed to record case delete log', e && e.message); }
      return res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};