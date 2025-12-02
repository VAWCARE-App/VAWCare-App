const mongoose = require("mongoose");

const AIInsightSchema = new mongoose.Schema({
    location: { type: String, required: true },
    incidentType: { type: String, required: true },

    // Cached AI response (array of reasons)
    reasons: { type: [String], default: [] },

    // Store the hash so we know if descriptions changed
    descriptionHash: { type: String, required: true },

    // Expiration (e.g., refresh every 7 days)
    lastUpdated: { type: Date, default: Date.now }
});

AIInsightSchema.index({ location: 1, incidentType: 1 }, { unique: true });

module.exports = mongoose.model("AIInsights", AIInsightSchema);
