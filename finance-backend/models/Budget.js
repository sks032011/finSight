const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.ObjectId,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ["Food", "Travel", "Entertainment", "Shopping", "Healthcare", "Work", "Bills", "Utilities", "Other"],
    required: true
  },
  limit: {
    type: Number,
    required: [true, "Budget limit is required"],
    min: [0.01, "Limit must be positive"]
  },
  spent: {
    type: Number,
    default: 0
  },
  month: {
    type: String, // "2024-03"
    required: true,
    index: true
  },
  alerts: [
    {
      threshold: { type: Number, enum: [25, 50, 75, 90, 100] }, // percentage
      triggered: { type: Boolean, default: false },
      triggeredAt: Date,
      message: String
    }
  ],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for fast lookups
budgetSchema.index({ userId: 1, month: 1 });
budgetSchema.index({ userId: 1, category: 1, month: 1 });

// Pre-save hook to update timestamp
// budgetSchema.pre("save", function(next) {
//   this.updatedAt = Date.now();
//   next();
// });
budgetSchema.pre("save", function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("Budget", budgetSchema);