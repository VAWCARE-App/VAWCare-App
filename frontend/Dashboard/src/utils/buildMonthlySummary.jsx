export function buildMonthlySummary(casesData) {
    const ABUSE_TYPES = [
        "SEXUAL",
        "PHYSICAL",
        "PSYCHOLOGICAL",
        "ECONOMIC",
        "OTHER VIOLATIONS"
    ];

    // Initialize summary: 12 months each
    const summary = {};
    ABUSE_TYPES.forEach(type => (summary[type] = Array(12).fill(0)));

    // Fill counts
    casesData.forEach(c => {
        const type = c.incidentType?.toUpperCase() || "OTHER VIOLATIONS";
        const month = new Date(c.dateReported || c.createdAt).getMonth(); // 0–11
        if (summary[type]) summary[type][month] += 1;
    });

    // Total per month
    const totalRow = Array(12).fill(0);
    Object.values(summary).forEach(arr => {
        arr.forEach((val, idx) => (totalRow[idx] += val));
    });

    return { summary, totalRow };
}
