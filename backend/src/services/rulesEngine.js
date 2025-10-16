const { Engine } = require('json-rules-engine');
const fs = require('fs');
const path = require('path');

// Models may or may not be available depending on how this module is invoked
let CasesModel = null;
let VictimModel = null;

const rulesDebug = !!(process.env.DSS_DEBUG && String(process.env.DSS_DEBUG).toLowerCase() !== 'false');
function rlog(...args) { if (rulesDebug) console.log(...args); }

function loadRules() {
  try {
    if (process.env.DSS_RULES) {
      const parsed = JSON.parse(process.env.DSS_RULES);
      if (Array.isArray(parsed)) return parsed;
    }
    const f = path.join(__dirname, '..', 'config', 'dss-rules.json');
    if (fs.existsSync(f)) {
      const raw = fs.readFileSync(f, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load DSS rules', e && e.message);
  }
  return [];
}

let engine = null;

function initEngine() {
  try {
    const rules = loadRules();
    rlog(`Loaded ${rules.length} DSS rules`);

    engine = new Engine();
    rules.forEach((r, i) => {
      engine.addRule(r);
      rlog(`Added rule ${i + 1}:`, { conditions: r.conditions, eventType: r.event && r.event.type });
    });

    // useful debug operator (no-op but logs)
    engine.addOperator('debug', (factValue, jsonValue) => {
      rlog('Debug operator called:', { factValue, jsonValue });
      return true;
    });

    // try to load models if available
    try { CasesModel = require('../models/Cases'); } catch (e) { CasesModel = null; }
    try { VictimModel = require('../models/Victims'); } catch (e) { VictimModel = null; }

    // recentReports: count of recent cases for victim (non-recursive)
    engine.addFact('recentReports', async (params, almanac) => {
      try {
        let victimId = null;
        try { victimId = await almanac.factValue('victimId'); } catch (e) { /* ignore */ }
        if (!victimId) { try { victimId = await almanac.factValue('facts.victimId'); } catch (e) { /* ignore */ } }
        if (!victimId) { try { victimId = await almanac.factValue('payload.victimId'); } catch (e) { /* ignore */ } }
        if (!victimId || !CasesModel) return 0;
        const since = new Date(); since.setMonth(since.getMonth() - 3);
        const count = await CasesModel.countDocuments({ $or: [{ victim: victimId }, { victimId: victimId }], createdAt: { $gte: since } });
        return count || 0;
      } catch (err) { rlog('recentReports fact error:', err && err.message); return 0; }
    });

    // descriptionLower: lowercased description from payload/facts
    engine.addFact('descriptionLower', async (params, almanac) => {
      try {
        let desc = '';
        try { desc = await almanac.factValue('description'); } catch (e) { /* ignore */ }
        if (!desc) { try { desc = await almanac.factValue('facts.description'); } catch (e) { /* ignore */ } }
        if (!desc) { try { desc = await almanac.factValue('payload.description'); } catch (e) { /* ignore */ } }
        return String(desc || '').toLowerCase();
      } catch (e) { rlog('descriptionLower fact error:', e && e.message); return ''; }
    });

    // injuries: boolean from provided facts or payload (do NOT call the 'injuries' fact recursively)
    engine.addFact('injuries', async (params, almanac) => {
      try {
        let v = undefined;
        try { v = await almanac.factValue('facts.injuries'); } catch (e) { /* ignore */ }
        if (v === undefined) { try { v = await almanac.factValue('payload.injuries'); } catch (e) { /* ignore */ } }
        return !!v;
      } catch (e) { rlog('injuries fact error:', e && e.message); return false; }
    });

    // injurySeverity: numeric severity from facts/payload
    engine.addFact('injurySeverity', async (params, almanac) => {
      try {
        let v = undefined;
        try { v = await almanac.factValue('facts.injurySeverity'); } catch (e) { /* ignore */ }
        if (v === undefined) { try { v = await almanac.factValue('payload.injurySeverity'); } catch (e) { /* ignore */ } }
        return Number(v) || 0;
      } catch (e) { rlog('injurySeverity fact error:', e && e.message); return 0; }
    });

    // victimType: prefer explicit facts/payload; otherwise look up victim document (non-recursive)
    engine.addFact('victimType', async (params, almanac) => {
      try {
        let vt = undefined;
        try { vt = await almanac.factValue('facts.victimType'); } catch (e) { /* ignore */ }
        if (vt === undefined) { try { vt = await almanac.factValue('payload.victimType'); } catch (e) { /* ignore */ } }
        if (vt) return String(vt);

        let victimId = null;
        try { victimId = await almanac.factValue('victimId'); } catch (e) { /* ignore */ }
        if (!victimId) { try { victimId = await almanac.factValue('facts.victimId'); } catch (e) { /* ignore */ } }
        if (!victimId) { try { victimId = await almanac.factValue('payload.victimId'); } catch (e) { /* ignore */ } }
        if (!victimId || !VictimModel) return '';
        try {
          const byId = await VictimModel.findOne({ $or: [{ _id: victimId }, { victimID: victimId }] }).lean();
          if (byId && byId.victimType) return String(byId.victimType);
        } catch (e) { rlog('victimType fact DB lookup error:', e && e.message); }
        return '';
      } catch (e) { rlog('victimType fact error:', e && e.message); return ''; }
    });

    return engine;
  } catch (e) {
    rlog('Failed to initialize rules engine', e && e.message);
    engine = null;
    return null;
  }
}

async function evaluateRules(facts) {
  try {
    if (!engine) initEngine();
    if (!engine) return { matched: false, events: [] };
    rlog('Evaluating rules with facts:', JSON.stringify(facts || {}, null, 2));
    const results = await engine.run(facts || {});
    rlog('Rule evaluation results:', { matched: results.events && results.events.length > 0, eventCount: results.events ? results.events.length : 0 });
    return { matched: results.events && results.events.length > 0, events: results.events || [] };
  } catch (e) {
    console.warn('Rules engine evaluation failed:', e && e.message);
    return { matched: false, events: [] };
  }
}

async function testEval(facts) {
  try {
    const res = await evaluateRules(facts || {});
    if (rulesDebug) console.log('testEval result:', res);
    return res;
  } catch (e) {
    console.error('testEval error:', e && e.message);
    throw e;
  }
}

module.exports = { initEngine, evaluateRules, testEval };
