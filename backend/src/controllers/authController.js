const asyncHandler = require('express-async-handler');
const { recordLog } = require('../middleware/logger');
const User = require('../models/Victims');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../utils/sendmail');

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  try {
    // record logout for whoever is calling (best-effort)
    await recordLog({ req, actorType: req.user?.role || 'victim', actorId: req.user?.adminID || req.user?.officialID || req.user?.victimID, action: 'logout', details: `User logged out from ${req.originalUrl || 'client'}` });
  } catch (e) {
    console.warn('Failed to record logout log', e && e.message);
  }

  res.status(200).json({ success: true, message: 'Logged out' });
});

// Password Reset Functionality
const sendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ victimEmail: email });
    if (!user)
      return res.status(404).json({ message: "Email not found." });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

    user.otp = otp;
    user.otpExpires = expires;
    await user.save();

    await sendMail(
      email,
      "Your OTP Code - VAWCare",
      `
        <p>Hello,</p>
        <p>Your One-Time Password (OTP) is: <b>${otp}</b></p>
        <p>This code will expire in <b>5 minutes</b>.</p>
        <p>If you did not request this, please ignore this message.</p>
        <br>
        <p>— VAWCare Barangay Support System</p>
      `
    );

    res.json({ message: "OTP sent successfully." });
  } catch (err) {
    console.error("Send OTP error:", err);
    res.status(500).json({ message: "Failed to send OTP." });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ victimEmail: email });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.otp || !user.otpExpires)
      return res.status(400).json({ message: "No OTP found. Request a new one." });

    if (String(user.otp) !== String(otp))
      return res.status(400).json({ message: "Invalid OTP." });

    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP expired." });

    res.json({ message: "OTP verified successfully." });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Error verifying OTP." });
  }
};



// Reset Password
const resetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ victimEmail: email });
    if (!user) return res.status(404).json({ message: "User not found." });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.victimPassword = hashedPassword;

    // Clear OTP after password reset
    user.otp = null;
    user.otpExpires = null;

    console.log("Before save:", user);
    const savedUser = await user.save();
    console.log("After save:", savedUser);

    res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Error resetting password." });
  }
};

module.exports = {
  logout,
  sendOTP,
  verifyOTP,
  resetPassword,
};
