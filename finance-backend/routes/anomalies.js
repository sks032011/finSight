const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Anomaly = require("../models/Anomaly");
const { checkAndCreateAnomaly } = require("../utils/anomalyDetector");

const router = express.Router();

// ========== GET ALL ANOMALIES ==========

router.get("/", auth, async (req, res) => {
  try {
    const status = req.query.status || "pending"; // pending, reviewed, dismissed
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    let query = { userId: req.user.id };
    if (status !== "all") {
      query.status = String(status);
    }

    const total = await Anomaly.countDocuments(query);
    const anomalies = await Anomaly.find(query)
      .sort({ anomalyScore: -1, date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      anomalies
    });
  } catch (error) {
    console.error("Get anomalies error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch anomalies"
    });
  }
});

// ========== GET SINGLE ANOMALY ==========

router.get("/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid anomaly ID"
      });
    }

    const anomaly = await Anomaly.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: "Anomaly not found"
      });
    }

    res.json({
      success: true,
      anomaly
    });
  } catch (error) {
    console.error("Get anomaly error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch anomaly"
    });
  }
});

// ========== MARK AS REVIEWED ==========

router.put("/:id/review", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid anomaly ID"
      });
    }

    const { userFeedback, userNotes } = req.body;

    const validFeedback = ["legitimate", "fraud", "false_alarm"];
    if (userFeedback && !validFeedback.includes(userFeedback)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback. Must be: legitimate, fraud, or false_alarm"
      });
    }

    const anomaly = await Anomaly.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: "Anomaly not found"
      });
    }

    anomaly.userFeedback = userFeedback || anomaly.userFeedback;
    anomaly.userNotes = userNotes || anomaly.userNotes;
    anomaly.status = "reviewed";
    anomaly.reviewedAt = new Date();

    await anomaly.save();

    res.json({
      success: true,
      message: "Anomaly reviewed",
      anomaly
    });
  } catch (error) {
    console.error("Review anomaly error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to review anomaly"
    });
  }
});

// ========== DISMISS ANOMALY ==========

router.put("/:id/dismiss", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid anomaly ID"
      });
    }

    const anomaly = await Anomaly.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!anomaly) {
      return res.status(404).json({
        success: false,
        message: "Anomaly not found"
      });
    }

    anomaly.status = "dismissed";
    anomaly.userFeedback = "false_alarm";
    anomaly.reviewedAt = new Date();

    await anomaly.save();

    res.json({
      success: true,
      message: "Anomaly dismissed",
      anomaly
    });
  } catch (error) {
    console.error("Dismiss anomaly error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to dismiss anomaly"
    });
  }
});

// ========== GET ANOMALY STATS ==========

router.get("/stats/summary", auth, async (req, res) => {
  try {
    const stats = await Anomaly.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(req.user.id) }
      },
      {
        $facet: {
          byStatus: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          byFraudConfidence: [
            { $match: { "aiExplanation.isFraud": true } },
            { $group: { _id: null, avgConfidence: { $avg: "$aiExplanation.fraudConfidence" } } }
          ],
          topAnomalies: [
            { $sort: { anomalyScore: -1 } },
            { $limit: 5 },
            { $project: { category: 1, amount: 1, anomalyScore: 1, description: 1 } }
          ]
        }
      }
    ]);

    const result = stats[0];

    res.json({
      success: true,
      total: await Anomaly.countDocuments({ userId: req.user.id }),
      pending: result.byStatus.find(s => s._id === "pending")?.count || 0,
      reviewed: result.byStatus.find(s => s._id === "reviewed")?.count || 0,
      dismissed: result.byStatus.find(s => s._id === "dismissed")?.count || 0,
      avgFraudConfidence: result.byFraudConfidence[0]?.avgConfidence || 0,
      topAnomalies: result.topAnomalies
    });
  } catch (error) {
    console.error("Get anomaly stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to get stats"
    });
  }
});

module.exports = router;