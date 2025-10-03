let tf = null;
// Use the pure-JS TensorFlow package only. This project does not require native bindings.
try {
  tf = require('@tensorflow/tfjs');
  console.log('Using @tensorflow/tfjs (pure JS) for DSS');
} catch (err) {
  console.info('No @tensorflow/tfjs available; DSS will run heuristics only.');
  tf = null;
}
const Cases = require('../models/Cases');

/**
 * Simple helper: convert incidentType string to one-hot vector
 */
function incidentTypeToOneHot(type) {
  // Order matches the risk ordering we use elsewhere: Economic < Psychological < Physical < Sexual
  const types = ['Economic', 'Psychological', 'Physical', 'Sexual', 'Other'];
  const idx = types.indexOf(type);
  return types.map((t, i) => (i === idx ? 1 : 0));
}

function riskLabelToIndex(label, incidentType) {
  // Our canonical risk labels (0..3)
  const canonical = ['Economic', 'Psychological', 'Physical', 'Sexual'];

  if (label && canonical.includes(label)) return canonical.indexOf(label);

  // Backwards-compatibility: map old Low/Medium/High to the new scale
  if (label === 'Low') return 0; // Economic
  if (label === 'Medium') return 1; // Psychological
  if (label === 'High') {
    // If the incident type is sexual, prefer mapping to Sexual; otherwise Physical
    if ((incidentType || '').toLowerCase() === 'sexual') return 3;
    return 2; // Physical
  }

  // If no label, but incidentType suggests sexual, return Sexual
  if ((incidentType || '').toLowerCase() === 'sexual') return 3;

  return 0; // default to Economic
}

function indexToRiskLabel(i) {
  return ['Economic', 'Psychological', 'Physical', 'Sexual'][i] || 'Economic';
}

/**
 * Build a more specific suggestion string using predicted risk and incident type
 */
function getDetailedSuggestion(predictedRisk, incidentType) {
  const it = (incidentType || '').toLowerCase();
  const pr = (predictedRisk || '').toLowerCase();

  // Sexual incidents: immediate referral, medical exam, legal support
  if (pr === 'sexual' || it.includes('sexual')) {
    return 'Escalate immediately: ensure victim safety, arrange medical/forensic exam, notify legal support, and assign a case officer for urgent follow-up.';
  }

  // Physical incidents: urgent medical and safety measures
  if (pr === 'physical' || it.includes('physical')) {
    return 'Escalate: provide/arrange medical attention, ensure safe accommodation, document injuries, and assign a case officer to coordinate response.';
  }

  // Psychological incidents: prioritize counselling and monitoring
  if (pr === 'psychological' || it.includes('psych')) {
    return 'Prioritize mental health support: refer to counselling services, schedule follow-up assessment, and assign an officer to monitor progress.';
  }

  // Economic incidents: connect to resources and support
  if (pr === 'economic' || it.includes('economic') || it.includes('financial')) {
    return 'Provide economic support: connect victim to social services, cash/benefit programs, livelihood assistance, and schedule a follow-up.';
  }

  // Default
  return 'Review the case and provide appropriate support or referrals; assign a case officer to follow up.';
}

async function buildAndTrainModel(samples, labels) {
  if (!tf) throw new Error('TensorFlow is not available');
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [samples[0].length], units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 4, activation: 'softmax' }));

  model.compile({ optimizer: 'adam', loss: 'sparseCategoricalCrossentropy', metrics: ['accuracy'] });

  const xs = tf.tensor2d(samples);
  const ys = tf.tensor1d(labels, 'int32');

  await model.fit(xs, ys, { epochs: 25, batchSize: 16, verbose: 0 });

  return model;
}

async function trainModelFromCases(minSamples = 50) {
  const docs = await Cases.find({}).limit(500).lean();
  if (!docs || docs.length < minSamples) return null; // not enough data

  const samples = [];
  const labels = [];

  docs.forEach(d => {
    const itVec = incidentTypeToOneHot(d.incidentType || 'Other');
    const status = d.status === 'Open' || d.status === 'Under Investigation' ? 1 : 0;
    const assigned = d.assignedOfficer ? 1 : 0;
    const descLen = (d.description || '').length;
    const descBucket = Math.min(1, Math.floor(descLen / 200));

    const feat = [...itVec, status, assigned, descBucket];
    samples.push(feat);
    labels.push(riskLabelToIndex(d.riskLevel, d.incidentType));
  });

  const model = await buildAndTrainModel(samples, labels);
  return { model };
}

/**
 * Suggest action from a case payload. If model is present, use it; otherwise heuristics.
 */
async function suggestForCase(payload, modelObj = null) {
  // payload: { incidentType, description, assignedOfficer, status }
  const itVec = incidentTypeToOneHot(payload.incidentType || 'Other');
  const status = payload.status === 'Open' || payload.status === 'Under Investigation' ? 1 : 0;
  const assigned = payload.assignedOfficer ? 1 : 0;
  const descLen = (payload.description || '').length;
  const descBucket = Math.min(1, Math.floor(descLen / 200));
  const feat = [...itVec, status, assigned, descBucket];

  if (modelObj && modelObj.model) {
    const logits = modelObj.model.predict(tf.tensor2d([feat]));
    const probs = Array.from(await logits.data());
    const idx = probs.indexOf(Math.max(...probs));
    const predictedRisk = indexToRiskLabel(idx);

    const suggestion = getDetailedSuggestion(predictedRisk, payload.incidentType);

    // Probability that immediate assistance is required (Physical or Sexual)
    const immediateProb = (probs[2] || 0) + (probs[3] || 0);
    const requiresImmediate = immediateProb >= 0.5;

    return { predictedRisk, probabilities: probs, suggestion, immediateAssistanceProbability: immediateProb, requiresImmediateAssistance: requiresImmediate };
  }

  // heuristics fallback
  // Determine heuristic index according to our canonical order [Economic, Psychological, Physical, Sexual]
  let heuristicIdx = 0; // default Economic
  const itLower = (payload.incidentType || '').toLowerCase();
  if (itLower === 'sexual') heuristicIdx = 3;
  else if (itLower === 'physical') heuristicIdx = 2;
  else if (itLower === 'psychological' || itLower === 'psychological abuse') heuristicIdx = 1;
  else if (itLower === 'economic' || itLower === 'financial') heuristicIdx = 0;
  else if (descLen > 500) heuristicIdx = 2; // long descriptions -> physical
  else if (payload.perpetrator) heuristicIdx = 2;

  const heuristicRisk = indexToRiskLabel(heuristicIdx);

  // Build a simple probability vector that places most mass on the heuristicIdx
  const probs = [0, 0, 0, 0].map(() => 0.0);
  const base = 0.05;
  for (let i = 0; i < probs.length; i++) probs[i] = base;
  probs[heuristicIdx] = 1 - base * (probs.length - 1);

  const suggestion = getDetailedSuggestion(heuristicRisk, payload.incidentType);

  // Also report immediate assistance probability (Physical + Sexual)
  const immediateProb = (probs[2] || 0) + (probs[3] || 0);
  const requiresImmediate = immediateProb >= 0.5;

  return { predictedRisk: heuristicRisk, probabilities: probs, suggestion, immediateAssistanceProbability: immediateProb, requiresImmediateAssistance: requiresImmediate };
}

module.exports = {
  trainModelFromCases,
  suggestForCase,
};
