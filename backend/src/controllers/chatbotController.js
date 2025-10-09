const asyncHandler = require("express-async-handler");
const chatbotService = require("../services/chatbotService");

exports.postMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, message: "Message is required" });
  }

  try {
    // Delegate logic to the service
    const aiReply = await chatbotService.generateChatbotResponse(req.user, message);
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
