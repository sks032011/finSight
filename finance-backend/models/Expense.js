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
  customCategory: {
    type: String,
    trim: true
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
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringFrequency: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly", null],
    default: null
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
  originalDescription: {
    type: String,
    trim: true
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
  attachments: [String],
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
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, category: 1 });
expenseSchema.index({ userId: 1, createdAt: -1 });

// // Update timestamp on save
// expenseSchema.pre("save", function(next) {
//   this.updatedAt = Date.now();
//   next();
// });

// MONGOOSE 8+)
expenseSchema.pre("save", function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("Expense", expenseSchema);