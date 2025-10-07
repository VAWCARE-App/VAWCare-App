const SystemLog = require('../models/SystemLogs');

function getIpFromReq(req) {
	const forwarded = (req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])) || null;
	return forwarded ? String(forwarded).split(',')[0].trim() : (req.ip || req.connection && req.connection.remoteAddress || '');
}

// Generic record helper used by controllers
async function recordLog({ req, actorType, actorId, action, details }) {
	try {
		// Prefer actorBusinessId supplied by frontend (localStorage) when present.
		// Also accept actor fields via headers set by the frontend axios instance.
		const actorBusinessId = (req && (req.body?.actorBusinessId || req.query?.actorBusinessId || req.headers?.['x-actor-business-id'])) || null;
		const headerActorId = (req && (req.body?.actorId || req.query?.actorId || req.headers?.['x-actor-id'])) || null;
		const headerActorType = (req && (req.body?.actorType || req.query?.actorType || req.headers?.['x-actor-type'])) || null;
		if (!actorId && req && req.user) {
			// Attempt to infer actor id from req.user if present
			if (req.user.role === 'admin' && req.user.adminID) actorId = req.user.adminID;
			else if (req.user.role === 'official' && req.user.officialID) actorId = req.user.officialID;
			else if (req.user.role === 'victim' && req.user.victimID) actorId = req.user.victimID;
		}

		// Prefer any header/body-supplied actor id/type over inferred req.user values
		if (headerActorId) actorId = headerActorId;
		if (headerActorType) actorType = headerActorType;

		const ipAddress = getIpFromReq(req || {});
		const payload = {
			logID: `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
			actorType: actorType || (req && req.user && req.user.role) || 'anonymous',
			actorId: actorId,
			actorBusinessId: actorBusinessId,
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
			const actorType = req.body?.actorType || req.query?.actorType || (req.user && req.user.role) || 'anonymous';
			let actorId = req.body?.actorId || req.query?.actorId || null;
			if (!actorId && req.user) actorId = req.user.adminID || req.user.officialID || req.user.victimID || null;
			const actorBusinessId = req.body?.actorBusinessId || req.query?.actorBusinessId || null;
			recordLog({ req, actorType, actorId, action: actionName, details: `Visited ${req.originalUrl}`, actorBusinessId });
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
