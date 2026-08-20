const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.ObjectId,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: [true, "Amount is required"],
    min: [0.01, "Amount must be positive"]
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true,
    maxlength: [500, "Description too long"]
  },
  category: {
    type: String,
    enum: ["Food", "Travel", "Entertainment", "Shopping", "Healthcare", "Work", "Bills", "Utilities", "Other"],
    required: [true, "Category is required"]
  },
  
  tags: {
    type: [String],
    default: []
  },
  date: {
    type: Date,
    required: [true, "Date is required"],
    default: Date.now,
    index: true
  },
  
  isCategorizedByAI: {
    type: Boolean,
    default: true
  },
  aiConfidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  
  notes: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ["manual", "csv_import", "bank_api"],
    default: "manual"
  },
  isEdited: {
    type: Boolean,
    default: false
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

// Compound indexes for fast queries
expenseSchema.index({ userId: 1, date: -1 });//for find({ userId }).sort({ date: -1 })
expenseSchema.index({ userId: 1, category: 1 });
expenseSchema.index({ userId: 1, createdAt: -1 });


expenseSchema.pre("save", function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("Expense", expenseSchema);