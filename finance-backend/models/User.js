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
  
  
  settings: {
    emailAlerts: { type: Boolean, default: true },
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

// hash password before saving... )
userSchema.pre("save", async function() {
  // Only hash if password is modified...not name or email
  if (!this.isModified("passwordHash")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  this.updatedAt = Date.now();
});

// method to compare passwords
userSchema.methods.comparePassword = async function(passwordAttempt) {
  return await bcrypt.compare(passwordAttempt, this.passwordHash);
};

// method to get safe user data (without password) whn user doc converted to jsonf
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.refreshTokens;
  return user;
};//res.json(user)



module.exports = mongoose.model("User", userSchema);