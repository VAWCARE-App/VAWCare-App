const asyncHandler = require('express-async-handler');
const dssService = require('../services/dssService');

const suggest = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  // Attempt to use model only if TensorFlow is available and a model can be trained or cached
  let result = null;
  try {
    if (!cachedModel) {
      cachedModel = await dssService.trainModelFromCases(50).catch(() => null);
    }
    result = await dssService.suggestForCase(payload, cachedModel);
  } catch (e) {
    // If TF is not available or something fails, fall back to heuristics via suggestForCase
    result = await dssService.suggestForCase(payload, null);
  }
  res.status(200).json({ success: true, data: result });
});

// POST /api/dss/suggest/cases
const suggestCasesInsights = asyncHandler(async (req, res) => {
  const opts = req.body || {};
  const result = await dssService.suggestForCasesInsights(opts).catch(e => null);
  if (!result) return res.status(500).json({ success: false, message: 'Failed to compute cases insights' });
  res.status(200).json({ success: true, data: result });
});

// POST /api/dss/suggest/reports
const suggestReportsInsights = asyncHandler(async (req, res) => {
  const opts = req.body || {};
  const result = await dssService.suggestForReportsInsights(opts).catch(e => null);
  if (!result) return res.status(500).json({ success: false, message: 'Failed to compute reports insights' });
  res.status(200).json({ success: true, data: result });
});

// POST /api/dss/suggest/alerts
const suggestAlertsInsights = asyncHandler(async (req, res) => {
  const opts = req.body || {};
  const result = await dssService.suggestForAlertsInsights(opts).catch(e => null);
  if (!result) return res.status(500).json({ success: false, message: 'Failed to compute alerts insights' });
  res.status(200).json({ success: true, data: result });
});

// GET /api/dss/cancellations?victimId=... or ?incidentType=...
const cancellations = asyncHandler(async (req, res) => {
  const { victimId, victimID, incidentType } = req.query || {};
  const lookbackMs = Number.isFinite(parseInt(process.env.DSS_CANCEL_LOOKBACK_MS, 10)) ? parseInt(process.env.DSS_CANCEL_LOOKBACK_MS, 10) : (365 * 24 * 60 * 60 * 1000);
  const since = new Date(Date.now() - lookbackMs);

  const result = { canceledCases: 0, canceledAlerts: 0, lookbackMs };
  try {
    const Cases = require('../models/Cases');
    const Alert = require('../models/Alert');

    if (victimId || victimID) {
      const vid = victimId || victimID;
      result.canceledCases = await Cases.countDocuments({ victimID: vid, status: 'Canceled', updatedAt: { $gte: since } }).exec();
      result.canceledAlerts = await Alert.countDocuments({ victimId: vid, status: 'Cancelled', updatedAt: { $gte: since } }).exec();
    } else if (incidentType) {
      result.canceledCases = await Cases.countDocuments({ incidentType: incidentType, status: 'Canceled', updatedAt: { $gte: since } }).exec();
      result.canceledAlerts = await Alert.countDocuments({ incidentType: incidentType, status: 'Cancelled', updatedAt: { $gte: since } }).exec();
    }
  } catch (e) {
    console.warn('dss.cancellations failed', e && e.message);
    return res.status(500).json({ success: false, message: 'Failed to compute cancellations' });
  }

  res.status(200).json({ success: true, data: result });
});

  // Test rules engine directly: POST /api/dss/test with arbitrary facts in body
  const testRules = asyncHandler(async (req, res) => {
    const facts = req.body || {};
    const { evaluateRules, initEngine } = require('../services/rulesEngine');
    initEngine();
    const out = await evaluateRules(facts);
    res.status(200).json({ success: true, data: out });
  });

module.exports = {
  suggest,
  suggestCasesInsights,
  suggestReportsInsights,
  suggestAlertsInsights,
  testRules,
  cancellations,
};
