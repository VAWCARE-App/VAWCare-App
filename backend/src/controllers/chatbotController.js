const asyncHandler = require("express-async-handler");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chatbot = require("../models/Chatbot");
const { recordLog } = require("../middleware/logger");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const postMessage = asyncHandler(async (req, res) => {
	const { message } = req.body;

	if (!message) {
		return res.status(400).json({ success: false, message: "Message is required" });
	}

	try {
		// ✅ use correct model name for new API
		const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

		const prompt = `
      You are VAWCare Assistant, a friendly and knowledgeable chatbot that provides
      accurate and empathetic information about laws protecting women and children
      in the Philippines, such as RA 9262 and the Safe Spaces Act.
      
      User: ${message}
    `;

		const result = await model.generateContent([
			{ text: `Reply briefly and clearly as a helpful chatbot.\nUser: ${message}` }
		]);

		const aiReply = result.response.text();

		await Chatbot.create({
			chatID: `CHAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
			victimID: req.user?.victimID || null,
			message,
			aiReply,
		});

		await recordLog({
			req,
			actorType: req.user?.role || "victim",
			actorId: req.user?.victimID || null,
			action: "chatbot_interaction",
			details: `User message: ${String(message).slice(0, 200)}`,
		}).catch(() => null);

		res.status(200).json({ success: true, reply: aiReply });
	} catch (err) {
		console.error("💥 Chatbot error:", err);
		res.status(500).json({
			success: false,
			message: "Failed to generate chatbot response",
			error: err.message,
		});
	}
});

module.exports = { postMessage };
