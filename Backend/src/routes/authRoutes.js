const express = require('express');
const user = require("../controllers/authController");
const { protect } = require('../middleware/auth');

const router = express.Router();

// Registration routes
router.post('/register/init', user.registerUser);
router.post("/register/verify-phone", user.verifyPhone);
router.post("/register/verify-otp", user.verifyRegistrationOTP);
router.post("/register/accept-terms", user.acceptTerms);

// User profile routes
router.get("/me", protect, user.getProfile);
router.put("/me", protect, user.updateProfile);

// Google authentication routes
router.post("/google", user.googleAuth);

// phone login routes
router.post("/login/phone", user.initiatePhoneLogin);
router.post("/login/verify-otp", user.verifyLoginOTP);

// Email login routes
router.post("/login/email", user.initiateEmailLogin);
router.post("/login/verify-email-otp", user.verifyEmailOTP);

// Password reset routes (phone)
router.post("/password/reset-request", user.initiatePasswordReset);
router.post("/password/verify-otp", user.verifyPasswordResetOTP);
router.post("/password/reset", user.resetPassword);

// Email OTP password reset routes (user-friendly flow with session support)
router.post("/password/email-otp-reset", user.initiateEmailPasswordReset);
router.post("/password/verify-email-otp", user.verifyEmailPasswordResetOTP);
router.post("/password/reset-with-email-otp", user.resetPasswordWithEmailOTP);

// Logout routes
router.post("/logout", protect, user.logout);
router.post("/logout-all-devices", protect, user.logoutAllDevices);

// Test route for logout without authentication middleware
router.post("/logout-test", user.logout);

// Add a debug route to check session state
router.get("/debug-session", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Session state",
    sessionExists: !!req.session,
    tempUserExists: !!req.session?.tempUser,
    tempUser: req.session?.tempUser || null
  });
});

module.exports = router;