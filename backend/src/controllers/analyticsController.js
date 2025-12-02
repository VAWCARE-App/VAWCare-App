const Cases = require("../models/Cases");

// Helper: generate possible reasons for most common incident
function generateReasons(type) {
    const reasons = {
        "Physical": [
            "High-stress household environments.",
            "Limited awareness of support services."
        ],
        "Emotional": [
            "Family conflict or relationship stress.",
            "Underreporting due to social stigma."
        ],
        "Sexual": [
            "Low reporting due to fear or shame.",
            "Lack of secure environments for minors."
        ],
        "Economic": [
            "Financial instability in the community.",
            "Unemployment or underemployment issues."
        ],
        "Others": ["No specific insights available."]
    };
    return reasons[type] || ["No insights available yet."];
}

module.exports = {
    // Overall distribution of abuse types
    getAbuseDistribution: async (req, res) => {
        try {
            const data = await Cases.aggregate([
                { $match: { deleted: { $ne: true } } },
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
            const data = await Cases.aggregate([
                { $match: { deleted: { $ne: true } } },
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

    // Most common abuse per purok
    getMostCommonPerLocation: async (req, res) => {
        try {
            const data = await Cases.aggregate([
                { $match: { deleted: { $ne: true } } },
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

            const enhanced = data.map((p) => ({
                location: p._id,
                mostCommon: p.mostCommon,
                count: p.count,
                reasons: generateReasons(p.mostCommon)
            }));

            res.json({ success: true, data: enhanced });
        } catch (err) {
            console.error("Error in getMostCommonPerLocation:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Get all cases in a purok with its most prevalent incident
    getCasesByPurokMostCommon: async (req, res) => {
        try {
            const { purok } = req.query;
            if (!purok) return res.status(400).json({ success: false, message: "Purok is required" });

            // Step 1: find most common incident type in this purok
            const mostCommonAgg = await Cases.aggregate([
                { $match: { deleted: { $ne: true } } },
                {
                    $addFields: {
                        purok: { $arrayElemAt: [{ $split: ["$location", ","] }, 0] }
                    }
                },
                { $match: { purok } },
                {
                    $group: { _id: "$incidentType", count: { $sum: 1 } }
                },
                { $sort: { count: -1 } },
                { $limit: 1 }
            ]);

            if (!mostCommonAgg.length) {
                return res.json({ success: true, data: [], message: "No cases found for this purok" });
            }

            const mostCommonType = mostCommonAgg[0]._id;

            // Step 2: fetch all cases with this incident type
            const cases = await Cases.find({
                deleted: { $ne: true },
                location: { $regex: `^${purok},` }, // match purok at start
                incidentType: mostCommonType
            }).sort({ dateReported: -1 });

            res.json({
                success: true,
                data: cases,
                mostCommonType,
                purok
            });
        } catch (err) {
            console.error("Error in getCasesByPurokMostCommon:", err);
            res.status(500).json({ success: false, message: err.message });
        }
    }
};
