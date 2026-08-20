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
  
  month: {
    type: String, // "2024-03"
    required: true,
    index: true
  },

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


budgetSchema.pre("save", function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("Budget", budgetSchema);