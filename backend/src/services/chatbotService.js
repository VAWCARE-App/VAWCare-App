// src/services/chatbotService.js
const fetch = require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chatbot = require("../models/Chatbot");
const { recordLog } = require("../middleware/logger");

const PROVIDER = process.env.PROVIDER || "gemini"; // "gemini" or "ollama"
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash"; // stable default
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

// Only init Gemini client if needed (avoids requiring API key for Ollama-only runs)
const genAI =
  PROVIDER === "gemini" && process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

function buildSystemPrompt(baseMessage) {
  const lowerMsg = String(baseMessage || "").toLowerCase();

  let context = "general";
  let system = `
You are the VAWCare Assistant for the VAWCare System.
Provide concise, accurate, supportive responses.
Avoid legal interpretations or medical advice.
If unsure, suggest contacting a professional or a hotline.

- No markdown/asterisks. Plain text only.
- Keep answers clear, short, and compassionate.
`.trim();

  if (lowerMsg.includes("emergency") || lowerMsg.includes("help now")) {
    context = "emergency";
    system += `
The user may be in danger. Calmly say:
- They can press the red Emergency button in the app; the system alerts barangay officials and their emergency contacts.
- Call 911 for emergencies (Philippines).
- Move to a safe place and reach out to trusted people.
Respond with compassion and urgency.
`.trim();
  } else if (lowerMsg.includes("report") || lowerMsg.includes("incident")) {
    context = "reporting";
    system += `
Explain briefly how to report via VAWCare.
They can go to "Report Case" in the app and fill out the incident form.
`.trim();
  } else if (lowerMsg.includes("law") || lowerMsg.includes("rights") || lowerMsg.includes("ra 9262")) {
    context = "legal-info";
    system += `
Provide simple summaries of laws like RA 9262 and the Safe Spaces Act.
Do not give legal advice—only factual info with neutral tone.
`.trim();
  } else if (lowerMsg.includes("hotline") || lowerMsg.includes("contact")) {
    context = "hotlines";
    system += `
Key hotlines (PH):
- Philippine Commission on Women (PCW) VAWC Helpline: 0917-867-1907, Email: iacvawc@pcw.gov.ph
- Provincial Police Office (Nueva Vizcaya): 0917-540-5290 (Camp Saturnino L. Dumlao, Bayombong)
- Barangay VAW Desk (Bonfal Proper): approach for immediate local support and referrals.
For emergencies, call 911.
`.trim();
  } else if (lowerMsg.includes("vawcare") || lowerMsg.includes("system")) {
    context = "system-info";
    system += `
VAWCare helps victims report cases, access resources, and receive assistance from authorities.
Mention features briefly: report case, chat support, profile management.
`.trim();
  }

  const final = `
${system}

User message: "${baseMessage}"
Respond appropriately for the context: ${context}.
Plain text only.
`.trim();

  return { context, finalPrompt: final };
}

async function callGemini(finalPrompt) {
  if (!genAI) {
    throw new Error("Gemini is selected but GEMINI_API_KEY is missing.");
  }
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  // The SDK accepts a string prompt OR a contents object.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    // simplest and most robust: pass a string prompt
    const result = await model.generateContent(finalPrompt, { signal: controller.signal });
    const text = result?.response?.text?.() || result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return (text || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

async function callOllama(systemPrompt, userMessage) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const resp = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: String(userMessage || "") },
        ],
        options: { temperature: 0.6 },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(`Ollama HTTP ${resp.status}: ${t}`);
    }
    const data = await resp.json();
    const content =
      data?.message?.content ||
      data?.message ||
      data?.response ||
      ""; // some models return `response`
    return String(content || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

exports.generateChatbotResponse = async (user, message) => {
  const { finalPrompt } = buildSystemPrompt(message);

  // Generate with selected provider
  let aiReply = "";
  try {
    if (PROVIDER === "ollama") {
      // For Ollama we separate system & user inside callOllama
      aiReply = await callOllama(finalPrompt, message);
    } else if (PROVIDER === "gemini") {
      aiReply = await callGemini(finalPrompt);
    } else {
      throw new Error(`Unsupported PROVIDER: ${PROVIDER}`);
    }
  } catch (err) {
    aiReply =
      "I'm sorry, I couldn't generate a response right now. Please try again in a moment or contact 911 if this is an emergency.";
    // Optionally log err.message somewhere central
  }

  // Save chat (non-blocking failure is okay)
  try {
    await Chatbot.create({
      chatID: `CHAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      victimID: user?.victimID || null,
      message,
      aiReply,
    });
  } catch (_) {}

  // Record audit log (best-effort)
  try {
    await recordLog({
      req: { user },
      actorType: user?.role || "victim",
      actorId: user?.victimID || null,
      action: "chatbot_interaction",
      details: `User message: ${String(message).slice(0, 200)}`,
    });
  } catch (_) {}

  return aiReply;
};
