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
    engine = new Engine();
    rules.forEach((r) => engine.addRule(r));

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

    // Provide a lowercase description fact for simple, case-insensitive text checks in rules
    engine.addFact('descriptionLower', async (params, almanac) => {
      try {
        let desc = null;
        try { desc = await almanac.factValue('description'); } catch (e) { /* ignore */ }
        if (!desc) {
          try { desc = await almanac.factValue('facts.description'); } catch (e) { /* ignore */ }
        }
        if (!desc) return '';
        return String(desc).toLowerCase();
      } catch (e) {
        return '';
      }
    });

    // Default boolean fact for injuries to avoid undefined-fact errors in rules
    engine.addFact('injuries', async (params, almanac) => {
      try {
        // Read only from the provided facts namespace to avoid recursion
        let v = undefined;
        try { v = await almanac.factValue('facts.injuries'); } catch (e) { /* ignore */ }
        // Also allow top-level 'description' payloads that may include injuries key directly in the facts passed in
        if (v === undefined) {
          try { v = await almanac.factValue('payload.injuries'); } catch (e) { /* ignore */ }
        }
        return !!v;
      } catch (e) {
        return false;
      }
    });

    // Default numeric fact for injurySeverity
    engine.addFact('injurySeverity', async (params, almanac) => {
      try {
        let v = undefined;
        try { v = await almanac.factValue('facts.injurySeverity'); } catch (e) { /* ignore */ }
        if (v === undefined) {
          try { v = await almanac.factValue('payload.injurySeverity'); } catch (e) { /* ignore */ }
        }
        return Number(v) || 0;
      } catch (e) {
        return 0;
      }
    });

    // Provide a victimType fact that reads from incoming facts or (if a victimId is present) queries the Victims model.
    engine.addFact('victimType', async (params, almanac) => {
      try {
        // Read from common incoming fact namespaces first
        let vt = undefined;
        try { vt = await almanac.factValue('facts.victimType'); } catch (e) { /* ignore */ }
        if (!vt) {
          try { vt = await almanac.factValue('payload.victimType'); } catch (e) { /* ignore */ }
        }
        if (vt) return String(vt);

        // If victimType not provided, try to get a victimId and look up the Victims model
        let victimId = undefined;
        try { victimId = await almanac.factValue('facts.victimId'); } catch (e) { /* ignore */ }
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
          return '';
        }

        return '';
      } catch (e) {
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
    const results = await engine.run(facts || {});
    return { matched: results.events && results.events.length > 0, events: results.events || [] };
  } catch (e) {
    console.warn('Rules engine evaluation failed', e && e.message);
    return { matched: false, events: [] };
  }
}

module.exports = { initEngine, evaluateRules };
