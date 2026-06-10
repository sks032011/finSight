const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { validateSignup, validateLogin } = require("../middleware/validate");
const auth = require("../middleware/auth");

const router = express.Router();

// ========== HELPER FUNCTIONS ==========

function generateTokens(userId) {//mongo id for d user user._id
  const accessToken = jwt.sign(
    { userId },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
}

// ========== SIGNUP ==========
router.post("/signup", validateSignup, async (req, res) => {
  try {
    const { email, name, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered. Try logging in."
      });
    }

    // Create new user
    const user = new User({
      email,
      name,
      passwordHash: password
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token to database
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Signup failed"
    });
  }
});

// ========== LOGIN ==========
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user (need passwordHash for comparison)
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    res.json({
      success: true,
      message: "Logged in successfully",
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Login failed"
    });
  }
});

// ========== REFRESH TOKEN ==========
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token required"
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if refresh token is in database
    if (!user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({
        success: false,
        message: "Refresh token revoked"
      });
    }

    // Remove old refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Save new refresh token
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    res.json({
      success: true,
      message: "Token refreshed",
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Token refresh failed"
    });
  }
});

// ========== LOGOUT ==========
router.post("/logout", auth, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Remove refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
    await user.save();

    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Logout failed"
    });
  }
});

// ========== GET CURRENT USER ==========
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch user"
    });
  }
});

module.exports = router;