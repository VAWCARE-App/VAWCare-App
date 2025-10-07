const asyncHandler = require('express-async-handler');
const { recordLog } = require('../middleware/logger');

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  try {
    // record logout for whoever is calling (best-effort)
    await recordLog({ req, actorType: req.user?.role || 'victim', actorId: req.user?.adminID || req.user?.officialID || req.user?.victimID, action: 'logout', details: `User logged out from ${req.originalUrl || 'client'}` });
  } catch (e) {
    console.warn('Failed to record logout log', e && e.message);
  }

  res.status(200).json({ success: true, message: 'Logged out' });
});

module.exports = { logout };
