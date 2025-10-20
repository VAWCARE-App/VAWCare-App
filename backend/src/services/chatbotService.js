const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chatbot = require("../models/Chatbot");
const { recordLog } = require("../middleware/logger");
const Fuse = require('fuse.js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Context definitions with priority (lower number = higher priority)
const CONTEXTS = [
  {
    name: "emergency",
    keywords: ["emergency", "help now", "tulong", "delikado", "banta", "panganib", "nakakatakot"],
    priority: 1,
    prompt: `
      The user may be in danger. Calmly tell them to:
      - Press the red emergency button in the app to alert officials and contacts.
      - Call 911 for emergencies.
      - Stay in a safe place and reach out to trusted people.
      Respond with compassion and urgency.
    `
  },
  {
    name: "reporting",
    keywords: ["report", "incident", "ireport", "ulat", "sumbong", "i-report", "i-ulat", "i-sumbong"],
    priority: 2,
    prompt: `
      Explain briefly how to report an incident through the VAWCare system.
      Users can report via the "Report Case" section in the app.
      Users should fill out the form with details of the incident.
      Users can view their reports in the "My Cases" section.
      Reports cannot be edited after submission.
    `
  },
  {
    name: "legal-info",
    keywords: ["law", "rights", "ra 9262", "batas", "karapatan", "karapatang pantao"],
    priority: 3,
    prompt: `
      Provide simple summaries of laws like RA 9262 and the Safe Spaces Act.
      Do not give legal advice — only factual information.
    `
  },
  {
    name: "hotlines",
    keywords: ["hotline", "contact", "call", "find", "tawag", "kontak", "hanap", "numero", "numero ng tulong"],
    priority: 4,
    prompt: `
      Philippine Commission on Women (PCW) VAWC Helpline
      Hotline: 0917-867-1907
      Email: iacvawc@pcw.gov.ph

      Provincial Police Office
      Hotline: 0917-540-5290
      Location: Camp Saturnino L Dumlao, Bayombong, Nueva Vizcaya

      Barangay Violence Against Women (VAW) Desk
      You may approach your Barangay VAW Desk in Bonfal Proper for local support and referrals.

      For emergencies, always call 112.
    `
  },
  {
    name: "system-info",
    keywords: ["vawcare", "system", "sistema", "app", "platform", "plataporma"],
    priority: 5,
    prompt: `
      The VAWCare System is a platform to report abuse, access resources, and get support.
      Explain features like reporting, chat support, and profile management briefly.
    `
  },
  {
    name: "barangay",
    keywords: ["bpo", "barangay", "desk", "vaw desk", "barangay desk", "bpo desk", "barangay vaw", "sanggunian", "opisina", "kapitan", "captain"],
    priority: 4.5, // slightly lower than hotlines
    prompt: `
      The user may need local support through their Barangay.
      Provide if asked:
      - Barangay Violence Against Women (VAW) Desk: Visit your local Barangay office for assistance.
      - Barangay Protection Order (BPO): A legal order issued at the Barangay level for immediate protection.
      - Barangay officials can help with initial reports and referrals.
    `
  },
  {
    name: "resources",
    keywords: ["resources", "tulong", "sanggunian", "support", "assistance", "help"],
    priority: 6,
    prompt: `
      Provide information about available resources for victims of violence.
      Include hotlines, shelters, counseling services, and legal aid.
    `
  }
];

const keywordList = CONTEXTS.flatMap(ctx =>
  ctx.keywords.map(keyword => ({ keyword, context: ctx }))
);

const fuse = new Fuse(keywordList, {
  keys: ["keyword"],
  includeScore: true,
  threshold: 0.4, // lower = stricter match, higher = more forgiving
  ignoreLocation: true,
});


// Detect context with fuzzy matching
function detectContextFuzzy(message) {
  const lowerMsg = message.toLowerCase();
  const searchResults = fuse.search(lowerMsg);

  if (!searchResults.length) return { name: "general", prompt: "" };

  // Pick the first match (best score)
  const matchedContext = searchResults[0].item.context;

  return matchedContext;
}

// Build system prompt
function buildSystemPrompt(contextPrompt) {
  return `
You are a personal VAWCare Assistant — a chatbot for the VAWCare System.
Provide concise, accurate, and supportive responses.
Avoid giving legal interpretations or medical advice.
When unsure, advise the user to contact a professional or hotline.
- Do not use markdown, asterisks, or formatting.
- Keep answers clear and conversational.
- Do not answer questions outside the scope of VAWCare.

Useful Information:
- The Barangay Captain of Bonfal Proper is Kapitan Regina Cristina Tumacder 
- The VAWC Officer is Kagawad Vangelyn Alcantara

${contextPrompt || ""}
`;
}

// Main function
exports.generateChatbotResponse = async (user, message) => {
  if (!message?.trim()) return "Please enter a message.";
  const sanitizedMsg = message.trim().slice(0, 1000);

  // Fetch last N messages for context (e.g., last 5)
  const history = await Chatbot.find({ victimID: user?.victimID })
    .sort({ createdAt: -1 })
    .limit(5);

  const historyPrompt = history
    .reverse()
    .map(chat => `User: ${chat.message}\nAI: ${chat.aiReply}`)
    .join("\n");


  const contextData = detectContextFuzzy(sanitizedMsg);
  const systemPrompt = buildSystemPrompt(contextData.prompt);

  const finalPrompt = `
    ${systemPrompt}

    Conversation history:
    ${historyPrompt}

    New user message: "${sanitizedMsg}"
    Respond appropriately for the context: ${contextData.name}.
    Keep your answer concise (2–3 sentences) and supportive.
  `;

  let aiReply = "Sorry, I couldn't process your request.";
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([{ text: finalPrompt }]);
    aiReply = result.response.text();
  } catch (err) {
    console.error("AI generation failed:", err);
  }

  await Chatbot.create({
    chatID: `CHAT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    victimID: user?.victimID || null,
    message: sanitizedMsg,
    aiReply,
  });

  recordLog({
    req: { user },
    actorType: user?.role || "victim",
    actorId: user?.victimID || null,
    action: "chatbot_interaction",
    details: sanitizedMsg.slice(0, 200),
  }).catch(() => null);

  return aiReply;
};
