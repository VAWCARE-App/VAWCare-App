const mongoose = require('mongoose');
const IncidentReport = require('../models/IncidentReports');
const Victim = require('../models/Victims');

function normalizeStatus(value) {
  if (!value) return undefined;
  const s = String(value).trim().toLowerCase();
  if (s === 'open') return 'Open';
  if (s === 'in-progress' || s === 'in progress' || s === 'under investigation') return 'Under Investigation';
  if (s === 'pending') return 'Pending';
  if (s === 'resolved' || s === 'closed') return 'Resolved';
  return undefined;
}

function normalizeRisk(value) {
  if (!value) return undefined;
  const r = String(value).trim().toLowerCase();
  if (r === 'low') return 'Low';
  if (r === 'medium') return 'Medium';
  if (r === 'high') return 'High';
  return undefined;
}

async function resolveVictimIdOnPayload(payload) {
  // If caller provided firebaseUid, resolve to victimID
  if (payload.firebaseUid) {
    const v = await Victim.findOne({ firebaseUid: payload.firebaseUid });
    if (v) payload.victimID = v._id;
    delete payload.firebaseUid;
  }

  // If a victimID string like 'VIC001' is provided, resolve it to the Victim._id
  if (payload.victimID) {
    if (mongoose.Types.ObjectId.isValid(payload.victimID)) {
      // already ObjectId string
    } else {
      const found = await Victim.findOne({ victimID: payload.victimID });
      if (!found) {
        const err = new Error('Provided victimID not found');
        err.statusCode = 400;
        throw err;
      }
      payload.victimID = found._id;
    }
  }
}

async function createReport(payload) {
  await resolveVictimIdOnPayload(payload);

  if (!payload.reportID) {
    payload.reportID = `RPT${Date.now().toString().slice(-6)}`;
  }

  const doc = new IncidentReport({
    reportID: payload.reportID,
    victimID: payload.victimID,
    incidentType: payload.incidentType,
    description: payload.description,
    location: payload.location,
    perpetrator: payload.perpetrator,
    dateReported: payload.dateReported || Date.now(),
    status: normalizeStatus(payload.status) || 'Pending',
    assignedOfficer: payload.assignedOfficer || 'Unassigned',
    riskLevel: normalizeRisk(payload.riskLevel) || 'Low',
  });

  await doc.save();
  // Only populate victim (do NOT try to populate a string)
  return doc.populate('victimID');
}

async function getReportById(id) {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ reportID: id }, { _id: id }] }
    : { reportID: id };

  return IncidentReport.findOne(query).populate('victimID', '-location');
}

async function listReports(filters = {}) {
  const query = {};
  if (filters.status) query.status = normalizeStatus(filters.status) || filters.status;
  if (filters.riskLevel) query.riskLevel = normalizeRisk(filters.riskLevel) || filters.riskLevel;
  if (filters.victimID) query.victimID = filters.victimID;

  return IncidentReport.find(query)
    .sort({ dateReported: -1 })
    .populate('victimID', '-location');
}

async function updateReport(id, updates) {
  const findQuery = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ reportID: id }, { _id: id }] }
    : { reportID: id };

  const report = await IncidentReport.findOne(findQuery);
  if (!report) return null;

  const normalized = { ...updates };
  const ns = normalizeStatus(updates.status);
  const nr = normalizeRisk(updates.riskLevel);
  if (ns) normalized.status = ns;
  if (nr) normalized.riskLevel = nr;

  const allowed = ['status', 'assignedOfficer', 'riskLevel', 'description', 'location', 'perpetrator'];
  allowed.forEach((k) => {
    if (normalized[k] !== undefined) report[k] = normalized[k];
  });

  await report.save();
  return report.populate('victimID', '-location');
}

module.exports = { createReport, getReportById, listReports, updateReport };
