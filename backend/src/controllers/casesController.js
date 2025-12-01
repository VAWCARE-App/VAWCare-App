const Cases = require('../models/Cases');
const mongoose = require('mongoose');
const reportService = require('../services/reportService');
const Victim = require('../models/Victims');
const IncidentReport = require('../models/IncidentReports');
const dssService = require('../services/dssService');
const { recordLog, extractKeyFields } = require('../middleware/logger');

// Helper: map an incident type (or 4-class predictedRisk) to stored riskLevel
function mapToStored(pred) {
  const p = (pred || '').toString().toLowerCase();
  if (p === 'economic') return 'Low';
  if (p === 'psychological') return 'Medium';
  if (p === 'physical') return 'High';
  if (p === 'sexual') return 'High';
  return 'Low';
}

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
        // Determine actor role (admin/official) from request
        const actorRole = req.user?.role || 'official';
        const actorIsPrivileged = ['admin', 'official'].includes(String(actorRole).toLowerCase());

        // Only treat provided riskLevel as a manual override if the actor is privileged and
        // the provided riskLevel differs from the default mapping for the incidentType.
        const providedRisk = typeof payload.riskLevel === 'string' && payload.riskLevel.trim() !== '' ? payload.riskLevel : null;
        const defaultForIncident = mapToStored(payload.incidentType);
        const isTrueManualOverride = actorIsPrivileged && providedRisk && providedRisk !== defaultForIncident;

        const dssInput = {
          incidentType: payload.incidentType,
          description: payload.description,
          assignedOfficer: payload.assignedOfficer,
          status: payload.status,
          perpetrator: payload.perpetrator,
          victimId: payload.victimID || payload.victimId || null,
          victimType: payload.victimType || null,
          // Include riskLevel only when it's a privileged manual override
          ...(isTrueManualOverride ? { riskLevel: providedRisk } : {})
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
          payload.dssImmediateAssistanceProbability = Number(dssRes.dssImmediateAssistanceProbability || 0);
          payload.dssSuggestion = dssRes.suggestion || dssRes.dssSuggestion || '';
          payload.dssRuleMatched = !!dssRes.dssRuleMatched;
          payload.dssChosenRule = dssRes.ruleDetails || dssRes.dssChosenRule || null;
          // Handle manual override - true only if the actor provided a privileged override
          payload.dssManualOverride = !!isTrueManualOverride;
        }
    } catch (e) {
      // Non-fatal: if DSS fails, continue with default riskLevel
      console.warn('DSS enrich failed during case creation', e?.message || e);
    }

    // Normalize victimType to canonical lowercase enum values expected by the schema
    try {
      if (payload.victimType) {
        payload.victimType = String(payload.victimType).trim().toLowerCase();
      }
    } catch (e) {
      // ignore normalization failures and proceed (will be caught by validation)
    }

    let created;
    try {
      created = await Cases.create(payload);
    } catch (createErr) {
      // Log payload and full error for debugging
      console.error('Failed to create case. Payload:', JSON.stringify(payload, null, 2));
      console.error('Cases.create error:', createErr && createErr.message ? createErr.message : createErr);
      // If duplicate key, provide more context
      if (createErr && createErr.code === 11000) {
        const dupField = Object.keys(createErr.keyValue || {}).join(', ');
        return res.status(400).json({ success: false, message: `Duplicate value for unique field(s): ${dupField}`, error: createErr });
      }
      // If validation error, return 400 with details
      if (createErr && createErr.name === 'ValidationError') {
        const details = Object.keys(createErr.errors || {}).reduce((acc, k) => {
          acc[k] = createErr.errors[k].message || createErr.errors[k].name;
          return acc;
        }, {});
        return res.status(400).json({ success: false, message: 'Validation failed', errors: details, error: createErr.message });
      }
      return res.status(500).json({ success: false, message: 'Failed to create case', error: createErr && createErr.message ? createErr.message : createErr });
    }
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
          const actorRole = req.user?.role || 'official';
          const actorIsPrivileged = ['admin', 'official'].includes(String(actorRole).toLowerCase());
          const providedRisk = typeof updates.riskLevel === 'string' && updates.riskLevel.trim() !== '' ? updates.riskLevel : null;
          const defaultForIncident = mapToStored(updates.incidentType || existing.incidentType);
          const isTrueManualOverride = actorIsPrivileged && providedRisk && providedRisk !== defaultForIncident;
          const dssInput = {
            incidentType: updates.incidentType || existing.incidentType,
            description: updates.description || existing.description,
            assignedOfficer: updates.assignedOfficer || existing.assignedOfficer,
            status: updates.status || existing.status,
            perpetrator: updates.perpetrator || existing.perpetrator,
            victimId: updates.victimID || updates.victimId || existing.victimID || existing.victim || null,
            victimType: updates.victimType || existing.victimType || null,
            // Only include riskLevel in DSS input if this is a privileged override
            ...(isTrueManualOverride ? { riskLevel: updates.riskLevel } : {})
          };
          const dssRes = await dssService.suggestForCase(dssInput, null);
          if (dssRes) {
            // merge DSS results into updates so they are persisted
            updates.dssPredictedRisk = dssRes.predictedRisk || dssRes.dssPredictedRisk;
            updates.dssStoredRisk = updates.riskLevel || dssRes.riskLevel || dssRes.dssStoredRisk;
            updates.dssImmediateAssistanceProbability = Number(dssRes.dssImmediateAssistanceProbability || 0);
            updates.dssSuggestion = dssRes.suggestion || dssRes.dssSuggestion || '';
            updates.dssRuleMatched = !!dssRes.dssRuleMatched;
            updates.dssChosenRule = dssRes.ruleDetails || dssRes.dssChosenRule || null;
            updates.dssManualOverride = !!isTrueManualOverride;
          }
        }
      } catch (e) {
        console.warn('DSS enrich during update failed', e && e.message);
      }
    }

    const item = await Cases.findOneAndUpdate(query, updates, { new: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Case not found or deleted' });
    
    // If case status is updated, sync the report status
    if (updates.status && item.reportID) {
      try {
        let reportStatusUpdate = {};
        if (updates.status === 'Open' || updates.status === 'Under Investigation') {
          reportStatusUpdate.status = updates.status;
        } else if (updates.status === 'Resolved' || updates.status === 'Cancelled') {
          reportStatusUpdate.status = 'Closed';
        }
        
        if (Object.keys(reportStatusUpdate).length > 0) {
          await IncidentReport.findOneAndUpdate(
            { reportID: item.reportID },
            reportStatusUpdate
          );
        }
      } catch (e) {
        console.warn('Failed to sync report status with case', e && e.message);
      }
    }
    
    try { await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'edit_case', details: `Edited case ${item.caseID || item._id}: ${extractKeyFields(updates)}` }); } catch(e) { console.warn('Failed to record case edit log', e && e.message); }
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

exports.getCaseHistory = async (req, res, next) => {
  try {
    const SystemLog = require('../models/SystemLogs');
    const Admin = require('../models/Admin');
    const BarangayOfficial = require('../models/BarangayOfficials');
    
    const id = req.params.id;
    
    // First, get the case to ensure it exists
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ caseID: id }, { _id: id }], deleted: { $ne: true } }
      : { caseID: id, deleted: { $ne: true } };
    const caseItem = await Cases.findOne(query).lean();
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    // Get all logs related to this case (view, edit, delete actions)
    // Search by case ID in the details field
    const caseIdPattern = new RegExp(caseItem.caseID || id, 'i');
    const logs = await SystemLog.find({
      action: { $in: ['view_case', 'edit_case', 'delete_case', 'case_remark'] },
      details: caseIdPattern
    })
    .sort({ timestamp: -1 })
    .lean();
    
    // Enrich logs with actor names
    const enrichedLogs = await Promise.all(logs.map(async (log) => {
      let actorName = log.actorBusinessId || 'Unknown User';
      
      try {
        if (log.adminID) {
          const admin = await Admin.findById(log.adminID).lean();
          if (admin) {
            actorName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || admin.adminID || actorName;
          }
        } else if (log.officialID) {
          const official = await BarangayOfficial.findById(log.officialID).lean();
          if (official) {
            actorName = `${official.firstName || ''} ${official.lastName || ''}`.trim() || official.officialID || actorName;
          }
        }
      } catch (e) {
        console.warn('Failed to enrich actor name for log', log._id, e?.message);
      }
      
      return {
        ...log,
        actorName
      };
    }));
    
    return res.json({ success: true, data: enrichedLogs });
  } catch (err) {
    next(err);
  }
};

exports.addCaseRemark = async (req, res, next) => {
  try {
    const SystemLog = require('../models/SystemLogs');
    const id = req.params.id;
    const { remark } = req.body;
    
    if (!remark || remark.trim() === '') {
      return res.status(400).json({ success: false, message: 'Remark is required' });
    }
    
    // Verify case exists
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ caseID: id }, { _id: id }], deleted: { $ne: true } }
      : { caseID: id, deleted: { $ne: true } };
    const caseItem = await Cases.findOne(query).lean();
    if (!caseItem) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    
    // Generate a unique log ID
    const logID = `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine actor info
    const actorType = req.user?.role || 'official';
    const actorId = req.user?.officialID || req.user?.adminID || null;
    const actorBusinessId = req.user?.officialID || req.user?.adminID || 'Unknown';
    
    // Create log entry
    const logPayload = {
      logID,
      action: 'case_remark',
      details: `Remark on case ${caseItem.caseID || id}: ${remark}`,
      timestamp: new Date(),
      ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
      actorBusinessId
    };
    
    if (actorType === 'admin' && actorId) {
      logPayload.adminID = actorId;
    } else if (actorType === 'official' && actorId) {
      logPayload.officialID = actorId;
    }
    
    await SystemLog.create(logPayload);
    
    return res.json({ success: true, message: 'Remark added successfully' });
  } catch (err) {
    next(err);
  }
};