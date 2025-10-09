const { Engine } = require('json-rules-engine');
const fs = require('fs');
const path = require('path');
// Cases model is used by an async fact that counts recent reports for a victim
let CasesModel = null;

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
    engine = new Engine();
    rules.forEach((r) => engine.addRule(r));

    // Register async facts that the rules may rely on (e.g. recentReports)
    // Lazy-require the Cases model to avoid circular dependency at module load
    try {
      CasesModel = require('../models/Cases');
    } catch (e) {
      // If the model can't be loaded for any reason, facts that need DB will return safe defaults
      CasesModel = null;
    }

    engine.addFact('recentReports', async (params, almanac) => {
      try {
        // Try to get a victimId from the facts passed in
        let victimId = null;
        try {
          victimId = await almanac.factValue('victimId');
        } catch (e) {
          // ignore
        }

        if (!victimId) {
          // also try nested fact names sometimes used in payloads
          try { victimId = await almanac.factValue('facts.victimId'); } catch (e) { /* ignore */ }
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
        return 0;
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
    const results = await engine.run(facts || {});
    return { matched: results.events && results.events.length > 0, events: results.events || [] };
  } catch (e) {
    console.warn('Rules engine evaluation failed', e && e.message);
    return { matched: false, events: [] };
  }
}

module.exports = { initEngine, evaluateRules };
