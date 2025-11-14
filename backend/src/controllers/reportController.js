const asyncHandler = require('express-async-handler');
const ReportService = require('../services/reportService');

// Create a new incident report (victim submits)
const { recordLog } = require('../middleware/logger');

const createReport = asyncHandler(async (req, res) => {
  const payload = req.body;
  // Pass perpetrator field if present
  if (req.body.perpetrator) payload.perpetrator = req.body.perpetrator;
  // attach victim reference if available (authenticated)
  if (req.user && req.user.uid) {
    payload.firebaseUid = req.user.uid;
  }

  const report = await ReportService.createReport(payload);

  // Record system log for report submission (victim or other actor)
  try {
    await recordLog({ req, actorType: req.user?.role || 'victim', actorId: req.user?.victimID || req.user?.officialID || req.user?.adminID, action: 'report_submission', details: `Report ${report.reportID || report._id} submitted` });
  } catch (e) {
    console.warn('Failed to record report submission log', e && e.message);
  }

  try {
    const Notification = require('../models/Notification');
    const { broadcast } = require('../utils/sse');

    const notif = await Notification.create({
      type: "new-report",
      refId: report._id,
      typeRef: "Report",
      message: `New report submitted: ${report.reportID || report._id}`,
      isRead: false
    });

    // Broadcast to all SSE clients
    broadcast("new-notif", notif);
    console.log('Broadcasted new report notification via SSE');
  } catch (e) {
    console.warn('Failed to create/broadcast notification', e?.message);
  }

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
  // Log view
  try {
    await recordLog({ req, actorType: req.user?.role || 'victim', actorId: req.user?.victimID || req.user?.officialID || req.user?.adminID, action: 'view_report', details: `Viewed report ${report.reportID || report._id}` });
  } catch (e) { console.warn('Failed to record report view log', e && e.message); }

  res.status(200).json({ success: true, data: report });
});

// List reports with optional filters: status, victimID
const listReports = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,

    victimID: req.query.victimID
  };
  const reports = await ReportService.listReports(filters);
  res.status(200).json({ success: true, data: reports });
});

// Update report status (protected for officials/admins)
const updateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const updated = await ReportService.updateReport(id, updates);
  if (!updated) {
    res.status(404);
    throw new Error('Report not found');
  }

  // Log edit
  try {
    await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'edit_report', details: `Updated report ${updated.reportID || updated._id}: ${JSON.stringify(updates)}` });
  } catch (e) { console.warn('Failed to record report edit log', e && e.message); }

  res.status(200).json({ success: true, message: 'Report updated', data: updated });
});

// Soft-delete a report
const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await ReportService.softDeleteReport(id);
  if (!deleted) {
    res.status(404);
    throw new Error('Report not found');
  }
  try {
    await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || req.user?.adminID, action: 'delete_report', details: `Soft-deleted report ${deleted.reportID || deleted._id}` });
  } catch (e) { console.warn('Failed to record report delete log', e && e.message); }

  res.status(200).json({ success: true, message: 'Report soft-deleted', data: deleted });
});

module.exports = {
  createReport,
  getReport,
  listReports,
  updateReport
  , deleteReport
};