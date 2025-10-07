(async () => {})();
const asyncHandler = require('express-async-handler');
const Chatbot = require('../models/Chatbot');
const { recordLog } = require('../middleware/logger');

// POST /api/chatbot/message
const postMessage = asyncHandler(async (req, res) => {
	const { message } = req.body;
	if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

	try {
		const victim = req.user && req.user.uid ? req.user.uid : null;
		// Create Chatbot record if victim ID is known via Victim lookup — keep minimal to avoid heavy lookups
		const chatDoc = await Chatbot.create({ chatID: `CHAT-${Date.now()}-${Math.floor(Math.random()*10000)}`, victimID: req.user?.victimID || null, message });

		// Record log
		try { await recordLog({ req, actorType: req.user?.role || 'victim', actorId: req.user?.victimID || null, action: 'chatbot_interaction', details: `Chat message: ${String(message).slice(0,200)}` }); } catch(e) { console.warn('Failed to record chatbot log', e && e.message); }

		res.status(201).json({ success: true, data: chatDoc });
	} catch (err) {
		console.error('chatbot postMessage error', err && err.message);
		res.status(500).json({ success: false, message: 'Failed to record chat message' });
	}
});

module.exports = { postMessage };

