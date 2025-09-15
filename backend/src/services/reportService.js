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

// riskLevel was removed from schema — no normalization needed

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
    // assignedOfficer and riskLevel removed from schema
  });

  await doc.save();
  // Populate victim for response (victimID is an ObjectId ref here)
  const populated = await doc.populate('victimID', '-victimPassword -location');
  const asObject = populated.toObject();
  return await enrichReportWithVictim(asObject);
}

async function getReportById(id) {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ reportID: id }, { _id: id }] }
    : { reportID: id };

  const doc = await IncidentReport.findOne(query).lean();
  if (!doc) return null;
  return await enrichReportWithVictim(doc);
}

async function listReports(filters = {}) {
  const query = {};
  if (filters.status) query.status = normalizeStatus(filters.status) || filters.status;
  // riskLevel filter removed
  if (filters.victimID) query.victimID = filters.victimID;
  const docs = await IncidentReport.find(query).sort({ dateReported: -1 }).lean();
  const results = [];
  for (const d of docs) {
    results.push(await enrichReportWithVictim(d));
  }
  return results;
}

async function updateReport(id, updates) {
  const findQuery = mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ reportID: id }, { _id: id }] }
    : { reportID: id };

  const report = await IncidentReport.findOne(findQuery);
  if (!report) return null;

  const normalized = { ...updates };
  const ns = normalizeStatus(updates.status);
  if (ns) normalized.status = ns;

  const allowed = ['status', 'description', 'location', 'perpetrator'];
  allowed.forEach((k) => {
    if (normalized[k] !== undefined) report[k] = normalized[k];
  });

  await report.save();
  const asObject = report.toObject();
  return await enrichReportWithVictim(asObject);
}

// Helper: given a report doc (lean object or toObject result), attach a victim summary and submissionType
async function enrichReportWithVictim(report) {
  if (!report) return report;
  let victimObj = null;

  try {
    // If victimID is already an object (populated), use it
    if (report.victimID && typeof report.victimID === 'object' && report.victimID._id) {
      victimObj = report.victimID;
    } else if (report.victimID) {
      // If it's an ObjectId string
      if (mongoose.Types.ObjectId.isValid(String(report.victimID))) {
        victimObj = await Victim.findById(report.victimID).select('-victimPassword -location').lean();
      } else {
        // treat as business victimID string (e.g., VIC001)
        victimObj = await Victim.findOne({ victimID: report.victimID }).select('-victimPassword -location').lean();
      }
    }
  } catch (e) {
    // ignore lookup errors, victimObj stays null
    victimObj = null;
  }

  // Build victim summary (non-sensitive)
  const victimSummary = victimObj
    ? {
        id: victimObj._id,
        victimID: victimObj.victimID,
        victimAccount: victimObj.victimAccount,
        firstName: victimObj.firstName,
        lastName: victimObj.lastName,
        contactNumber: victimObj.contactNumber,
        firebaseUid: victimObj.firebaseUid,
        isAnonymous: victimObj.isAnonymous || false
      }
    : null;

  // Attach submissionType (use victimAccount if available, else infer from isAnonymous)
  const submissionType = victimSummary ? (victimSummary.victimAccount || (victimSummary.isAnonymous ? 'anonymous' : 'regular')) : null;

  return {
    ...report,
    victim: victimSummary,
    submissionType
  };
}

module.exports = { createReport, getReportById, listReports, updateReport };
