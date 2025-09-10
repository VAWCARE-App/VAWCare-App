const asyncHandler = require('express-async-handler');
const ReportService = require('../services/reportService');

// Create a new incident report (victim submits)
const createReport = asyncHandler(async (req, res) => {
  const payload = req.body;
  // Pass perpetrator field if present
  if (req.body.perpetrator) payload.perpetrator = req.body.perpetrator;
  // attach victim reference if available (authenticated)
  if (req.user && req.user.uid) {
    payload.firebaseUid = req.user.uid;
  }

  const report = await ReportService.createReport(payload);

  res.status(201).json({
    success: true,
    message: 'Report created',
    data: report
  });
});

// Get a report by ID
const getReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await ReportService.getReportById(id);
  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }
  res.status(200).json({ success: true, data: report });
});

// List reports with optional filters: status, riskLevel, victimID
const listReports = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    riskLevel: req.query.riskLevel,
    victimID: req.query.victimID
  };
  const reports = await ReportService.listReports(filters);
  res.status(200).json({ success: true, data: reports });
});

// Update report status / assignedOfficer (protected for officials/admins)
const updateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updated = await ReportService.updateReport(id, updates);
  if (!updated) {
    res.status(404);
    throw new Error('Report not found');
  }

  res.status(200).json({ success: true, message: 'Report updated', data: updated });
});

module.exports = {
  createReport,
  getReport,
  listReports,
  updateReport
};