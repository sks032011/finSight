// Input validation middleware

const validateSignup = (req, res, next) => {
  const { email, name, password, passwordConfirm } = req.body;

  // Check all fields exist
  if (!email || !name || !password || !passwordConfirm) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  // Check email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email"
    });
  }

  // Check password length
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  // Check passwords match
  if (password !== passwordConfirm) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  // Check name length
  if (name.length < 2) {
    return res.status(400).json({
      success: false,
      message: "Name must be at least 2 characters"
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password required"
    });
  }

  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email"
    });
  }

  next();
};

module.exports = {
  validateSignup,
  validateLogin
};