const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.ObjectId,
    required: true,
    index: true
  },
  month: {
    type: String, // "2024-03"
    required: true
  },
  type: {
    type: String,
    enum: ["monthly_summary", "savings_opportunity", "anomaly_alert", "trend_analysis"],
    default: "monthly_summary"
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  insights: [
    {
      title: String,
      description: String,
      recommendation: String,
      confidence: { type: Number, min: 0, max: 1 }
    }
  ],
  metadata: {
    totalSpent: Number,
    transactionCount: Number,
    avgTransaction: Number,
    highestCategory: String
  },
  isAcknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: Date,
  expireAt: {
    type: Date,
    index: { expireAfterSeconds: 0 } // TTL index - auto delete after 30 days
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for fast lookups
insightSchema.index({ userId: 1, month: 1 });
insightSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Insight", insightSchema);