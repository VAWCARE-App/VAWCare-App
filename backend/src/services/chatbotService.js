const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chatbot = require("../models/Chatbot");
const { recordLog } = require("../middleware/logger");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.generateChatbotResponse = async (user, message) => {
  const lowerMsg = message.toLowerCase();

  // Rule-based context detection
  let context = "general";
  let systemPrompt = `
    You are their personal VAWCare Assistant — a chatbot for the VAWCare System.
    Provide concise, accurate, and supportive responses.
    Avoid giving legal interpretations or medical advice.
    When unsure, advise the user to contact a professional or hotline.

    - Do not use markdown, asterisks (**), or any formatting.
    - Keep answers clear and conversational.
    - Do not answer questions outside the scope of VAWCare.
  `;

  if (lowerMsg.includes("emergency") || lowerMsg.includes("help now")) {
    context = "emergency";
    systemPrompt += `
      The user may be in danger. Calmly tell them to:
      - They can presss the red emergency button in the app and the system will alert barangay officials and their emergency contacts.
      - Call 911 for emergencies.
      - Stay in a safe place and reach out to trusted people.
      Respond with compassion and urgency.
    `;
  } else if (lowerMsg.includes("report") || lowerMsg.includes("incident")) {
    context = "reporting";
    systemPrompt += `
      Explain briefly how to report an incident through the VAWCare system.
      They can report through the app by going to the "Report Case" section and filling out the form.
    `;
  } else if (lowerMsg.includes("law") || lowerMsg.includes("rights") || lowerMsg.includes("ra 9262")) {
    context = "legal-info";
    systemPrompt += `
      Provide simple summaries of laws like RA 9262 and the Safe Spaces Act.
      Do not give legal advice — only factual information.
    `;
  } else if (lowerMsg.includes("hotline") || lowerMsg.includes("contact") || lowerMsg.includes("call") || lowerMsg.includes("find")) {
    context = "hotlines";
    systemPrompt += `
      Philippine Commission on Women (PCW) VAWC Helpline
      Hotline: 0917-867-1907
      Email: iacvawc@pcw.gov.ph

      Provincial Police Office
      Hotline: 0917-540-5290
      Location: Camp Saturnino L Dumlao, Bayombong, Nueva Vizcaya

      Barangay Violence Against Women (VAW) Desk
      You may approach your Barangay VAW Desk in Bonfal Proper for immediate local support and referral to legal, medical, and psychological services.

      For emergencies, always call 112.
    `;
  } else if (lowerMsg.includes("vawcare") || lowerMsg.includes("system")) {
    context = "system-info";
    systemPrompt += `
      The VAWCare System is a platform that helps victims of abuse report cases,
      access resources, and get assistance from authorities.
      Offer a short explanation of features like reporting, chat support, and profile management.
    `;
  }

  // Combine system and user prompt
  const finalPrompt = `
    ${systemPrompt}

    User message: "${message}"
    Respond appropriately for the context: ${context}.
  `;

  // Generate AI reply
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent([{ text: finalPrompt }]);
  const aiReply = result.response.text();

  // Save chat
  await Chatbot.create({
    chatID: `CHAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    victimID: user?.victimID || null,
    message,
    aiReply,
  });

  // Record log (not critical if fails)
  await recordLog({
    req: { user },
    actorType: user?.role || "victim",
    actorId: user?.victimID || null,
    action: "chatbot_interaction",
    details: `User message: ${String(message).slice(0, 200)}`,
  }).catch(() => null);

  return aiReply;
};
