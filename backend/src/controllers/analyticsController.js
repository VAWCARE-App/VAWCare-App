const Cases = require("../models/Cases");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const crypto = require("crypto");
const AIInsights = require("../models/AIInsights");

module.exports = {
    // Overall distribution of abuse types
    getAbuseDistribution: async (req, res) => {
        try {
            const { victimType } = req.query;
            const matchStage = { deleted: { $ne: true } };
            if (victimType && victimType !== "all") {
                matchStage.victimType = victimType;
            }
            const data = await Cases.aggregate([
                { $match: matchStage },
                { $group: { _id: "$incidentType", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]);
            res.json({ success: true, data });
        } catch (err) {
            console.error("Error in getAbuseDistribution:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Distribution per purok
    getAbusePerLocation: async (req, res) => {
        try {
            const { victimType } = req.query;
            const matchStage = { deleted: { $ne: true } };
            if (victimType && victimType !== "all") {
                matchStage.victimType = victimType;
            }
            const data = await Cases.aggregate([
                { $match: matchStage },
                {
                    $addFields: {
                        purok: { $arrayElemAt: [{ $split: ["$location", ","] }, 0] }
                    }
                },
                {
                    $group: {
                        _id: { purok: "$purok", type: "$incidentType" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: "$_id.purok",
                        abuses: { $push: { type: "$_id.type", count: "$count" } }
                    }
                },
                { $sort: { _id: 1 } }
            ]);
            res.json({ success: true, data });
        } catch (err) {
            console.error("Error in getAbusePerLocation:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Most common abuse per purok with most common subtype
    getMostCommonPerLocation: async (req, res) => {
        try {
            const { victimType } = req.query;
            const matchStage = { deleted: { $ne: true } };
            if (victimType && victimType !== "all") {
                matchStage.victimType = victimType;
            }

            // Step 1: Get most common incident type per purok
            const data = await Cases.aggregate([
                { $match: matchStage },
                {
                    $addFields: {
                        purok: { $arrayElemAt: [{ $split: ["$location", ","] }, 0] }
                    }
                },
                {
                    $group: {
                        _id: { purok: "$purok", type: "$incidentType" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.purok": 1, count: -1 } },
                {
                    $group: {
                        _id: "$_id.purok",
                        mostCommon: { $first: "$_id.type" },
                        count: { $first: "$count" }
                    }
                }
            ]);

            // Step 2: For each purok, find the most common subtype
            const response = await Promise.all(data.map(async (purokData) => {
                const subtypeAgg = await Cases.aggregate([
                    { $match: matchStage },
                    {
                        $addFields: {
                            purok: { $arrayElemAt: [{ $split: ["$location", ","] }, 0] }
                        }
                    },
                    {
                        $match: {
                            purok: purokData._id,
                            incidentType: purokData.mostCommon
                        }
                    },
                    {
                        $group: {
                            _id: "$incidentSubtype",
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 1 }
                ]);

                const mostCommonSubtype = subtypeAgg.length > 0 ? subtypeAgg[0]._id : "Uncategorized";
                const subtypeCount = subtypeAgg.length > 0 ? subtypeAgg[0].count : 0;

                return {
                    location: purokData._id,
                    mostCommonIncidentType: purokData.mostCommon,
                    incidentCount: purokData.count,
                    mostCommonSubtype: mostCommonSubtype,
                    subtypeCount: subtypeCount
                };
            }));

            res.json({ success: true, data: response });
        } catch (err) {
            console.error("Error in getMostCommonPerLocation:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Get overall most common subtype
    getMostCommonSubtype: async (req, res) => {
        try {
            const { victimType } = req.query;
            const matchStage = { deleted: { $ne: true } };
            if (victimType && victimType !== "all") {
                matchStage.victimType = victimType;
            }

            const data = await Cases.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: "$incidentSubtype",
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ]);

            const mostCommon = data.length > 0 ? data[0]._id : "Uncategorized";
            const count = data.length > 0 ? data[0].count : 0;

            res.json({ success: true, data: { mostCommonSubtype: mostCommon, count } });
        } catch (err) {
            console.error("Error in getMostCommonSubtype:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    },
    // Get all cases in a purok with its most prevalent incident
    getCasesByPurokMostCommon: async (req, res) => {
        try {
            const { purok, victimType } = req.query;
            if (!purok) return res.status(400).json({ success: false, message: "Purok is required" });

            // Step 1: find most common incident type in this purok
            const matchStage = { deleted: { $ne: true } };
            if (victimType && victimType !== "all") {
                matchStage.victimType = victimType;
            }
            
            const mostCommonAgg = await Cases.aggregate([
                { $match: matchStage },
                { $addFields: { purok: { $arrayElemAt: [{ $split: ["$location", ","] }, 0] } } },
                { $match: { purok } },
                { $group: { _id: "$incidentType", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ]);

            if (!mostCommonAgg.length) {
                return res.json({ success: true, data: [], message: "No cases found for this purok" });
            }

            const mostCommonType = mostCommonAgg[0]._id;

            // Step 2: fetch all cases with this incident type
            const caseQuery = {
                deleted: { $ne: true },
                location: { $regex: `^${purok},` },
                incidentType: mostCommonType
            };
            if (victimType && victimType !== "all") {
                caseQuery.victimType = victimType;
            }
            
            const cases = await Cases.find(caseQuery).sort({ dateReported: -1 });

            // Step 3: check AI insights cache
            const descriptionsText = cases.map(c => c.description || "").join("\n");
            const descriptionHash = crypto.createHash("sha256").update(descriptionsText).digest("hex");

            let aiInsight = await AIInsights.findOne({ location: purok, incidentType: mostCommonType });

            let aiReasons = aiInsight?.reasons || null;

            // Only generate AI reasons if user explicitly requested and cache is missing/stale
            if (!aiInsight || aiInsight.descriptionHash !== descriptionHash) {
                aiReasons = null; // won't generate automatically
            }

            res.json({
                success: true,
                data: cases,
                mostCommonType,
                purok,
                aiReasons // null unless generated manually
            });

        } catch (err) {
            console.error("Error in getCasesByPurokMostCommon:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    },
    generateAIReasons: async (req, res) => {
        try {
            const { purok, incidentType } = req.body;
            if (!purok || !incidentType)
                return res.status(400).json({ success: false, message: "Purok and incidentType are required" });

            // Fetch relevant cases
            const cases = await Cases.find({
                deleted: { $ne: true },
                location: { $regex: `^${purok},` },
                incidentType
            });

            if (!cases.length)
                return res.status(404).json({ success: false, message: "No cases found" });

            const descriptionsText = cases.map(c => c.description || "").join("\n").trim();

            if (!descriptionsText || descriptionsText.split(/\s+/).length < 5) {
                // Too little info to generate meaningful insights
                const fallbackReason = ["Information is lacking. No insights available."];
                await AIInsights.findOneAndUpdate(
                    { location: purok, incidentType },
                    { reasons: fallbackReason, descriptionHash: "" },
                    { upsert: true, new: true }
                );
                return res.json({ success: true, reasons: fallbackReason });
            }

            const descriptionHash = crypto.createHash("sha256").update(descriptionsText).digest("hex");
            console.log("Description hash:", descriptionHash);

            // Generate AI response
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const aiResponse = await model.generateContent([
                {
                    text: `
You are analyzing case descriptions of abuse for a social services report. 
For the incident type "${incidentType}" in ${purok}, summarize 3-5 key reasons why this incident type occurs, **in terms of risk factors, patterns, or social context**:
- Generalize all information; do not include victim names, quotes, or specific identifiers.
- Use simple words that are easy to understand.
- Each bullet must be a **full sentence**.
- Do **not** use headings, colons, or extra labels.
- Keep each reason short (1-2 sentences max) and use bullet points only.
- Only respond with bullet points no introduction message.
- If there is insufficient information, respond with: "Information is lacking. No insights available."

Case descriptions:
${descriptionsText}
`
                }
            ]);

            // Extract text from response
            const outputText = aiResponse.response?.text?.() || "";
            let reasons = outputText
                .split(/\n|•|-/)
                .map(line => line.replace(/^\s*\*\s*/, "").trim())
                .map(r => r.trim())
                .filter(Boolean);

            // Cache/update AIInsights
            await AIInsights.findOneAndUpdate(
                { location: purok, incidentType },
                { reasons, descriptionHash },
                { upsert: true, new: true }
            );

            res.json({ success: true, reasons, updatedAt: AIInsights?.updatedAt || new Date() });

        } catch (err) {
            console.error("Error in generateAIReasons:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    },
    getAIInsights: async (req, res) => {
        try {
            const { purok, incidentType } = req.query;
            if (!purok || !incidentType)
                return res.status(400).json({ success: false, message: "Purok and incidentType are required" });

            const aiInsight = await AIInsights.findOne({ location: purok, incidentType });

            res.json({ success: true, reasons: aiInsight?.reasons || [] });

        } catch (err) {
            console.error("Error in getAIInsights:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    },
};
