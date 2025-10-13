const { Engine } = require('json-rules-engine');
const fs = require('fs');
const path = require('path');
// Cases model is used by an async fact that counts recent reports for a victim
let CasesModel = null;
let VictimModel = null;

// Simple wrapper around json-rules-engine. Rules can be loaded from
// backend/config/dss-rules.json or via environment variable DSS_RULES (JSON string).

function loadRules() {
  try {
    // try env variable first
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
    console.log(`Loaded ${rules.length} DSS rules`);
    
    engine = new Engine();
    rules.forEach((r, i) => {
      engine.addRule(r);
      console.log(`Added rule ${i + 1}:`, {
        conditions: r.conditions,
        eventType: r.event.type
      });
    });

    // Add debug operator for logging fact values
    engine.addOperator('debug', (factValue, jsonValue) => {
      console.log('Debug fact value:', { fact: factValue, expected: jsonValue });
      return true;
    });

    // Register async facts that the rules may rely on (e.g. recentReports)
    // Lazy-require the Cases model to avoid circular dependency at module load
    try {
      CasesModel = require('../models/Cases');
      try { VictimModel = require('../models/Victims'); } catch (e) { VictimModel = null; }
    } catch (e) {
      // If the model can't be loaded for any reason, facts that need DB will return safe defaults
      CasesModel = null;
    }

    engine.addFact('recentReports', async (params, almanac) => {
      try {
        // Try multiple locations for victimId without throwing if undefined
        let victimId = null;
        try { victimId = await almanac.factValue('victimId'); } catch (e) { /* ignore */ }
        if (!victimId) {
          try { victimId = await almanac.factValue('facts.victimId'); } catch (e) { /* ignore */ }
        }
        if (!victimId) {
          try { victimId = await almanac.factValue('payload.victimId'); } catch (e) { /* ignore */ }
        }

        if (!victimId || !CasesModel) return 0;

        // Count reports in the last 3 months for a conservative window
        const since = new Date();
        since.setMonth(since.getMonth() - 3);

        const count = await CasesModel.countDocuments({
          $or: [{ victim: victimId }, { victimId: victimId }],
          createdAt: { $gte: since }
        });
        return count || 0;
      } catch (err) {
        // On error, return 0 so rules don't false-positive
        console.error('recentReports fact error:', err && err.message);
        return 0;
      }
    });

    // Provide a lowercase description fact for simple, case-insensitive text checks in rules
    engine.addFact('descriptionLower', async (params, almanac) => {
      try {
        let desc = '';
        try { desc = await almanac.factValue('description'); } catch (e) { /* ignore */ }
        if (!desc) {
          try { desc = await almanac.factValue('facts.description'); } catch (e) { /* ignore */ }
        }
        if (!desc) {
          try { desc = await almanac.factValue('payload.description'); } catch (e) { /* ignore */ }
        }
        return String(desc || '').toLowerCase();
      } catch (e) {
        console.error('descriptionLower fact error:', e && e.message);
        return '';
      }
    });

    // Default boolean fact for injuries to avoid undefined-fact errors in rules
    engine.addFact('injuries', async (params, almanac) => {
      try {
        let v = false;
        try { v = await almanac.factValue('injuries'); } catch (e) { /* ignore */ }
        if (v === undefined) {
          try { v = await almanac.factValue('facts.injuries'); } catch (e) { /* ignore */ }
        }
        if (v === undefined) {
          try { v = await almanac.factValue('payload.injuries'); } catch (e) { /* ignore */ }
        }
        return !!v;
      } catch (e) {
        console.error('injuries fact error:', e && e.message);
        return false;
      }
    });

    // Default numeric fact for injurySeverity
    engine.addFact('injurySeverity', async (params, almanac) => {
      try {
        let v = 0;
        try { v = await almanac.factValue('injurySeverity'); } catch (e) { /* ignore */ }
        if (!v) {
          try { v = await almanac.factValue('facts.injurySeverity'); } catch (e) { /* ignore */ }
        }
        if (!v) {
          try { v = await almanac.factValue('payload.injurySeverity'); } catch (e) { /* ignore */ }
        }
        return Number(v) || 0;
      } catch (e) {
        console.error('injurySeverity fact error:', e && e.message);
        return 0;
      }
    });

    // Provide a victimType fact that reads from incoming facts or (if a victimId is present) queries the Victims model.
    engine.addFact('victimType', async (params, almanac) => {
      try {
        // Read from common incoming fact namespaces first, tolerant of undefined facts
        let vt = '';
        try { vt = await almanac.factValue('victimType'); } catch (e) { /* ignore */ }
        if (!vt) {
          try { vt = await almanac.factValue('facts.victimType'); } catch (e) { /* ignore */ }
        }
        if (!vt) {
          try { vt = await almanac.factValue('payload.victimType'); } catch (e) { /* ignore */ }
        }
        if (vt) return String(vt);

        // If victimType not provided, try to get a victimId and look up the Victims model
        let victimId = null;
        try { victimId = await almanac.factValue('victimId'); } catch (e) { /* ignore */ }
        if (!victimId) {
          try { victimId = await almanac.factValue('facts.victimId'); } catch (e) { /* ignore */ }
        }
        if (!victimId) {
          try { victimId = await almanac.factValue('payload.victimId'); } catch (e) { /* ignore */ }
        }
        if (!victimId || !VictimModel) return '';

        // victimId may be an ObjectId or business id; try both
        try {
          const byId = await VictimModel.findOne({ $or: [{ _id: victimId }, { victimID: victimId }] }).lean();
          if (byId && byId.victimType) return String(byId.victimType);
        } catch (e) {
          // on any DB error, return empty string to avoid false-positive rule matches
          console.error('victimType fact DB lookup error:', e && e.message);
          return '';
        }

        return '';
      } catch (e) {
        console.error('victimType fact error:', e && e.message);
        return '';
      }
    });
    return engine;
  } catch (e) {
    console.warn('Failed to initialize rules engine', e && e.message);
    engine = null;
    return null;
  }
}

async function evaluateRules(facts) {
  try {
    if (!engine) initEngine();
    if (!engine) return { matched: false, events: [] };

    // Debug log the incoming facts
    console.log('Evaluating rules with facts:', JSON.stringify(facts, null, 2));

    // Run the engine with the provided facts (do not mutate rules at runtime)
    const results = await engine.run(facts || {});
    
    // Log the results
    console.log('Rule evaluation results:', {
      matched: results.events && results.events.length > 0,
      eventCount: results.events?.length || 0,
      events: results.events
    });

    return { matched: results.events && results.events.length > 0, events: results.events || [] };
  } catch (e) {
    console.warn('Rules engine evaluation failed:', e && e.message, e.stack);
    return { matched: false, events: [] };
  }
}

module.exports = { initEngine, evaluateRules };

// Test helper: call from node to quickly evaluate rules with custom facts
async function testEval(f) {
  try {
    const res = await evaluateRules(f || {});
    console.log('testEval result:', res);
    return res;
  } catch (e) {
    console.error('testEval error:', e && e.message);
    throw e;
  }
}

module.exports.testEval = testEval;
