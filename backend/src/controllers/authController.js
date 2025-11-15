const asyncHandler = require('express-async-handler');
const { recordLog } = require('../middleware/logger');
const User = require('../models/Victims');
const bcrypt = require('bcryptjs');
const { sendMail } = require('../utils/sendmail');
const { clearAuthCookie, clearUserDataCookie } = require('../utils/cookieUtils');

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  try {
    // Determine actor info and build a human-friendly details string
    const headerActorBusinessId = req && (req.body?.actorBusinessId || req.query?.actorBusinessId || req.headers?.['x-actor-business-id']);
    const headerActorId = req && (req.body?.actorId || req.query?.actorId || req.headers?.['x-actor-id']);
    const headerActorType = req && (req.body?.actorType || req.query?.actorType || req.headers?.['x-actor-type']);

    const actorType = headerActorType || req.user?.role || 'victim';
    let actorId = headerActorId || req.user?.adminID || req.user?.officialID || req.user?.victimID || null;
    const actorBusinessId = headerActorBusinessId || null;

    // Choose pretty id for details: prefer actorBusinessId (e.g. ADM001), fall back to actorId
    const idLabel = actorBusinessId || (actorId ? String(actorId) : 'Unknown');
    const prettyActorType = (actorType || 'User').charAt(0).toUpperCase() + (actorType || 'User').slice(1);
    const details = `${prettyActorType} ${idLabel} logged out`;

    // record logout for whoever is calling (best-effort). Include actorBusinessId so it gets stored.
    await recordLog({ req, actorType, actorId, actorBusinessId, action: 'logout', details });
  } catch (e) {
    console.warn('Failed to record logout log', e && e.message);
  }
  
  // Clear the HTTP-only authentication cookie and user data cookie
  clearAuthCookie(res);
  clearUserDataCookie(res);
  
  res.status(200).json({ success: true, message: 'Logged out' });
});

// Password Reset Functionality
const sendOTP = async (req, res) => {
  let { email } = req.body;
  if (typeof email === 'string') email = email.trim().toLowerCase();

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
  let { email, otp } = req.body;
  if (typeof email === 'string') email = email.trim().toLowerCase();

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
  let { email, password } = req.body;
  if (typeof email === 'string') email = email.trim().toLowerCase();

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

const me = asyncHandler(async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userInfo = {
      uid: req.user.uid || null,
      email: req.user.email || req.user.victimEmail,
      role: req.user.role || 'victim',
      name: req.user.name || req.user.victimName || 'Unknown',
    };

    res.status(200).json({
      success: true,
      user: userInfo,
    });
  } catch (error) {
    console.error('[auth/me] error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user info' });
  }
});

// POST /api/auth/set-token
// Frontend calls this after exchanging custom token for ID token
// Receives the ID token and user data, sets both in secure HTTP-only cookies
const setToken = asyncHandler(async (req, res) => {
  const { idToken, userData } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'ID token is required' });
  }

  try {
    // Verify the ID token is valid before setting it in cookie
    const admin = require('../config/firebase-config');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Set the ID token in HTTP-only cookie
    const { setAuthCookie, setUserDataCookie } = require('../utils/cookieUtils');
    setAuthCookie(res, idToken);
    
    // Also set user data in secure HTTP-only cookie if provided
    if (userData) {
      setUserDataCookie(res, userData);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Token and user data set in HTTP-only cookies',
      uid: decodedToken.uid 
    });
  } catch (error) {
    console.error('[auth/set-token] Error:', error.message);
    res.status(401).json({ success: false, message: 'Invalid ID token' });
  }
});

// GET /api/auth/user-data
// Returns user data from the secure HTTP-only cookie
// This endpoint is used by frontend to retrieve user metadata without exposing it to XSS
const getUserData = asyncHandler(async (req, res) => {
  try {
    const { getUserDataFromCookie } = require('../utils/cookieUtils');
    const userData = getUserDataFromCookie(req);
    
    if (!userData) {
      return res.status(401).json({ success: false, message: 'User data not found' });
    }
    
    res.status(200).json({
      success: true,
      userData: userData
    });
  } catch (error) {
    console.error('[auth/user-data] Error:', error.message);
    res.status(500).json({ success: false, message: 'Error retrieving user data' });
  }
});

module.exports = {
  logout,
  sendOTP,
  verifyOTP,
  resetPassword,
  me,
  setToken,
  getUserData
};
