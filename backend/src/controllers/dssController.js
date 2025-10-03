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

module.exports = {
  trainModel,
  suggest,
};
