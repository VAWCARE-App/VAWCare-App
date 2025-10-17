const asyncHandler = require('express-async-handler');
const dssService = require('../services/dssService');

// In-memory cached model object to avoid retraining each request
let cachedModel = null;

// Optionally trigger training on server startup via another endpoint or periodically
const trainModel = asyncHandler(async (req, res) => {
  const result = await dssService.trainModelFromCases(30);
  if (!result) return res.status(200).json({ success: false, message: 'Not enough historical cases to train model' });
  cachedModel = result;
  res.status(200).json({ success: true, message: 'Model trained', info: { trained: true } });
});

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
  trainModel,
  suggest,
  testRules,
  cancellations,
};
