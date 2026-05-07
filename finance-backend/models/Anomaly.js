const mongoose = require("mongoose");

const anomalySchema = new mongoose.Schema({
  userId: {
    type: mongoose.ObjectId,
    required: true,
    index: true
  },
  expenseId: {
    type: mongoose.ObjectId,
    required: true,
    ref: "Expense"
  },
  category: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Statistical analysis
  zScore: {
    type: Number,
    required: true // How many standard deviations from mean
  },
  anomalyScore: {
    type: Number, // 0-100
    required: true
  },
  historicalMean: {
    type: Number,
    required: true
  },
  historicalStdDev: {
    type: Number,
    required: true
  },
  historicalCount: {
    type: Number, // How many transactions analyzed
    required: true
  },
  
  // AI explanation
  aiExplanation: {
    reason: String, // Why this is unusual
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    isFraud: Boolean, // AI assessment
    fraudConfidence: Number // 0-1
  },
  
  // User feedback
  userFeedback: {
    type: String,
    enum: ["legitimate", "fraud", "false_alarm", null],
    default: null
  },
  userNotes: String,
  reviewedAt: Date,
  
  status: {
    type: String,
    enum: ["pending", "reviewed", "dismissed"],
    default: "pending"
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
anomalySchema.index({ userId: 1, date: -1 });
anomalySchema.index({ userId: 1, status: 1 });
anomalySchema.index({ userId: 1, anomalyScore: -1 });

module.exports = mongoose.model("Anomaly", anomalySchema);