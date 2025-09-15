const Cases = require('../models/Cases');
const IncidentReport = require('../models/IncidentReports');
const Victim = require('../models/Victims');
const mongoose = require('mongoose');

exports.createCase = async (req, res, next) => {
  try {
    const payload = req.body;
    const created = await Cases.create(payload);
    try {
      const g = (s) => `\x1b[32m${s}\x1b[0m`;
      // Determine actor: prefer adminID or officialID from req.user, then uid/email
      let actor = req.user?.adminID || req.user?.officialID || req.user?.uid || req.user?.email || 'anonymous';

      // Determine victimID: prefer case.victimID or payload, else try linked report
      let victimId = created?.victimID || created?.victimId || payload?.victimID || payload?.victimId || null;
      if (!victimId && created?.reportID) {
        try {
          const rpt = await IncidentReport.findOne({ $or: [{ reportID: created.reportID }, { _id: created.reportID }] }).lean();
          if (rpt && (rpt.victimID || rpt.victimId)) victimId = rpt.victimID || rpt.victimId;
        } catch (e) {
          // ignore
        }
      }
      // If victimId is an ObjectId, try to get the business victimID (VICxxx)
      try {
        if (victimId) {
          const vdoc = await Victim.findById(victimId).lean();
          if (vdoc && vdoc.victimID) victimId = vdoc.victimID;
        }
      } catch (e) {
        // ignore
      }

      console.log(
        'Case created:',
        `\ncaseID=${g(created.caseID || 'N/A')} by=${g(actor)} victimID=${g(victimId || 'N/A')}`
      );
    } catch (logErr) {
      console.warn('Failed to log case creation', logErr);
    }
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

exports.listCases = async (req, res, next) => {
  try {
    // Exclude soft-deleted cases by default
    const items = await Cases.find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).lean();
    try {
      const g = (s) => `\x1b[32m${s}\x1b[0m`;
      const actorList = req.user?.adminID || req.user?.officialID || req.user?.uid || req.user?.email || 'anonymous';
      console.log(
        'Cases listed:',
        `\ncount=${g(items.length)} by=${g(actorList)}`
      );
    } catch (logErr) {
      console.warn('Failed to log cases list', logErr);
    }
    return res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

exports.getCase = async (req, res, next) => {
  try {
    const id = req.params.id;
    // Build query safely: only include _id branch when id looks like a valid ObjectId
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ caseID: id }, { _id: id }], deleted: { $ne: true } }
      : { caseID: id, deleted: { $ne: true } };
    const item = await Cases.findOne(query).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Case not found or deleted' });
    try {
      const g = (s) => `\x1b[32m${s}\x1b[0m`;
      let actor = req.user?.adminID || req.user?.officialID || req.user?.uid || req.user?.email || 'anonymous';
      let victimId = item?.victimID || item?.victimId || null;
      if (!victimId && item?.reportID) {
        try {
          const rpt = await IncidentReport.findOne({ $or: [{ reportID: item.reportID }, { _id: item.reportID }] }).lean();
          if (rpt && (rpt.victimID || rpt.victimId)) victimId = rpt.victimID || rpt.victimId;
        } catch (e) {
          // ignore
        }
      }
      try {
        if (victimId) {
          const vdoc = await Victim.findById(victimId).lean();
          if (vdoc && vdoc.victimID) victimId = vdoc.victimID;
        }
      } catch (e) {
        // ignore
      }

      console.log(
        'Case fetched:',
        `\ncaseID=${g(item.caseID || 'N/A')} by=${g(actor)} victimID=${g(victimId || 'N/A')}`
      );
    } catch (logErr) {
      console.warn('Failed to log case fetch', logErr);
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

exports.updateCase = async (req, res, next) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ caseID: id }, { _id: id }], deleted: { $ne: true } }
      : { caseID: id, deleted: { $ne: true } };
    // Get existing before update for diffing
    const before = await Cases.findOne(query).lean();
    if (!before) return res.status(404).json({ success: false, message: 'Case not found or deleted' });

    const item = await Cases.findOneAndUpdate(query, updates, { new: true }).lean();

    // Compute a before/after diff for the updated fields
    const diffs = {};
    Object.keys(updates || {}).forEach((k) => {
      try {
        const a = before?.[k];
        const b = item?.[k];
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          diffs[k] = { before: a === undefined ? null : a, after: b === undefined ? null : b };
        }
      } catch (e) {
        diffs[k] = { before: String(before?.[k]), after: String(item?.[k]) };
      }
    });

    try {
      const g = (s) => `\x1b[32m${s}\x1b[0m`;
      let actor = req.user?.adminID || req.user?.officialID || req.user?.uid || req.user?.email || 'anonymous';
      let victimId = updates?.victimID || updates?.victimId || item?.victimID || item?.victimId || null;
      if (!victimId && (updates?.reportID || item?.reportID)) {
        const rptIdU = updates?.reportID || updates?.reportId || item?.reportID || item?.reportId;
        if (rptIdU) {
          try {
            const rptU = await IncidentReport.findOne({ $or: [{ reportID: rptIdU }, { _id: rptIdU }] }).lean();
            if (rptU && (rptU.victimID || rptU.victimId)) victimId = rptU.victimID || rptU.victimId;
          } catch (e) {
            // ignore
          }
        }
      }
      try {
        if (victimId) {
          const vdoc = await Victim.findById(victimId).lean();
          if (vdoc && vdoc.victimID) victimId = vdoc.victimID;
        }
      } catch (e) {
        // ignore
      }

      console.log(
        'Case updated:',
        `\ncaseID=${g(item.caseID || 'N/A')} by=${g(actor)} victimID=${g(victimId || 'N/A')}`,
        `\nupdates=${g(Object.keys(diffs).length ? JSON.stringify(diffs) : 'none')}`
      );
    } catch (logErr) {
      console.warn('Failed to log case update', logErr);
    }

    return res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

exports.deleteCase = async (req, res, next) => {
  try {
    const id = req.params.id;
    // Soft delete: mark as deleted and set deletedAt
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { $or: [{ caseID: id }, { _id: id }], deleted: { $ne: true } }
      : { caseID: id, deleted: { $ne: true } };
    const item = await Cases.findOneAndUpdate(query, { deleted: true, deletedAt: new Date() }, { new: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'Case not found or already deleted' });
    try {
      const g = (s) => `\x1b[32m${s}\x1b[0m`;
      let actor = req.user?.adminID || req.user?.officialID || req.user?.uid || req.user?.email || 'anonymous';
      let victimId = item?.victimID || item?.victimId || null;
      if (!victimId && item?.reportID) {
        try {
          const rptD = await IncidentReport.findOne({ $or: [{ reportID: item.reportID }, { _id: item.reportID }] }).lean();
          if (rptD && (rptD.victimID || rptD.victimId)) victimId = rptD.victimID || rptD.victimId;
        } catch (e) {
          // ignore
        }
      }
      try {
        if (victimId) {
          const vdoc = await Victim.findById(victimId).lean();
          if (vdoc && vdoc.victimID) victimId = vdoc.victimID;
        }
      } catch (e) {
        // ignore
      }

      console.log(
        'Case deleted(soft):',
        `\ncaseID=${g(item.caseID || 'N/A')} deletedAt=${g(item.deletedAt)} by=${g(actor)} victimID=${g(victimId || 'N/A')}`
      );
    } catch (logErr) {
      console.warn('Failed to log case delete', logErr);
    }
    return res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};
