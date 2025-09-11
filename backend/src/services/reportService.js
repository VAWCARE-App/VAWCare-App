const mongoose = require('mongoose');
const IncidentReport = require('../models/IncidentReports');
const Victim = require('../models/Victims');

async function createReport(payload) {
	// If caller provided firebaseUid, resolve to victimID
	if (payload.firebaseUid) {
		const v = await Victim.findOne({ firebaseUid: payload.firebaseUid });
		if (v) payload.victimID = v._id;
		delete payload.firebaseUid;
	}
	// If a victimID string like 'VIC001' is provided, resolve it to the Victim._id
	if (payload.victimID) {
		// If it's already a valid ObjectId, keep it
		if (mongoose.Types.ObjectId.isValid(payload.victimID)) {
			// nothing to do
		} else {
			// Try to find by victimID field (e.g., VIC001)
			const found = await Victim.findOne({ victimID: payload.victimID });
			if (!found) {
				const err = new Error('Provided victimID not found');
				err.statusCode = 400;
				throw err;
			}
			payload.victimID = found._id;
		}
	}

	if (!payload.reportID) payload.reportID = `RPT${Date.now().toString().slice(-6)}`;

	const doc = new IncidentReport({
		reportID: payload.reportID,
		victimID: payload.victimID,
		incidentType: payload.incidentType,
		description: payload.description,
		location: payload.location,
		dateReported: payload.dateReported || Date.now(),
		status: payload.status || 'Pending',
		assignedOfficer: payload.assignedOfficer || 'Vangelyn V. Alcantara',
		riskLevel: payload.riskLevel || 'Low'
	});

	await doc.save();
	return doc;
}

async function getReportById(id) {
	return IncidentReport.findOne({ reportID: id }).populate('victimID');
}

async function listReports(filters = {}) {
	// If no filters provided, return all reports
	const query = {};
	if (filters.status) query.status = filters.status;
	if (filters.riskLevel) query.riskLevel = filters.riskLevel;
	if (filters.victimID) query.victimID = filters.victimID;

	return IncidentReport.find(query).sort({ dateReported: -1 }).populate('victimID');
}

async function updateReport(id, updates) {
	const report = await IncidentReport.findOne({ reportID: id });
	if (!report) return null;

	const allowed = ['status', 'assignedOfficer', 'riskLevel', 'description', 'location'];
	allowed.forEach((k) => {
		if (updates[k] !== undefined) report[k] = updates[k];
	});

	await report.save();
	return report;
}

module.exports = { createReport, getReportById, listReports, updateReport };
