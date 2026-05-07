const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"]
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true
  },
  passwordHash: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6,
    select: false // Don't return password hash in queries by default
  },
  currency: {
    type: String,
    default: "INR",
    enum: ["INR", "USD", "EUR", "GBP"]
  },
  timezone: {
    type: String,
    default: "Asia/Kolkata"
  },
  settings: {
    emailAlerts: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
    notificationFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly"
    }
  },
  refreshTokens: {
    type: [String],
    default: []
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

// // Hash password before saving
// userSchema.pre("save", async function(next) {
//   // Only hash if password is modified
//   if (!this.isModified("passwordHash")) {
//     return next();
//   }

//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
//     this.updatedAt = Date.now();
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// hash password before saving... MONGOOSE 8+)
userSchema.pre("save", async function() {
  // Only hash if password is modified
  if (!this.isModified("passwordHash")) {
    return;
  }

  // no need for next in new Mongoose async hooks
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  this.updatedAt = Date.now();
});

// method to compare passwords
userSchema.methods.comparePassword = async function(passwordAttempt) {
  return await bcrypt.compare(passwordAttempt, this.passwordHash);
};

// method to get safe user data (without password)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.refreshTokens;
  return user;
};

// Index for fast lookups
userSchema.index({ email: 1 });

module.exports = mongoose.model("User", userSchema);