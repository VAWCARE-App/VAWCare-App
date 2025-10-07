const SystemLog = require('../models/SystemLogs');

function getIpFromReq(req) {
	const forwarded = (req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])) || null;
	return forwarded ? String(forwarded).split(',')[0].trim() : (req.ip || req.connection && req.connection.remoteAddress || '');
}

// Generic record helper used by controllers
async function recordLog({ req, actorType, actorId, action, details }) {
	try {
		if (!actorId && req && req.user) {
			// Attempt to infer actor id from req.user if present
			if (req.user.role === 'admin' && req.user.adminID) actorId = req.user.adminID;
			else if (req.user.role === 'official' && req.user.officialID) actorId = req.user.officialID;
			else if (req.user.role === 'victim' && req.user.victimID) actorId = req.user.victimID;
		}

		const ipAddress = getIpFromReq(req || {});
		const payload = {
			logID: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
			actorType: actorType || (req && req.user && req.user.role) || 'anonymous',
			actorId: actorId,
			action,
			details: details || '',
			ipAddress,
			timestamp: new Date()
		};

		await SystemLog.createLog(payload);
	} catch (err) {
		// Non-fatal. Don't let logging break main flows.
		console.warn('recordLog failed:', err && err.message);
	}
}

// Express middleware to create a page_view log for a route
function pageViewLogger(actionName = 'page_view') {
	return async (req, res, next) => {
		// fire-and-forget
		try {
			const actorType = req.user && req.user.role ? req.user.role : 'anonymous';
			let actorId = null;
			if (req.user) {
				actorId = req.user.adminID || req.user.officialID || req.user.victimID || null;
			}
			recordLog({ req, actorType, actorId, action: actionName, details: `Visited ${req.originalUrl}` });
		} catch (e) {
			console.warn('pageViewLogger inner error', e && e.message);
		}
		next();
	};
}

module.exports = {
	recordLog,
	pageViewLogger
};
