const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

router.get("/abuse-distribution", analyticsController.getAbuseDistribution);
router.get("/abuse-per-location", analyticsController.getAbusePerLocation);
router.get("/most-common-per-location", analyticsController.getMostCommonPerLocation);
router.get("/cases-by-purok", analyticsController.getCasesByPurokMostCommon);
router.post("/ai", analyticsController.generateAIReasons);
router.get("/insights", analyticsController.getAIInsights);

module.exports = router;
