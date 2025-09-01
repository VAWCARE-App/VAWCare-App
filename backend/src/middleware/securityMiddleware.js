const admin = require('firebase-admin');
const asyncHandler = require('express-async-handler');

// Require multi-factor authentication for sensitive routes
const requireMultiFactorAuth = asyncHandler(async (req, res, next) => {
    // Check if user has completed multi-factor authentication
    const user = await admin.auth().getUser(req.user.uid);
    
    if (req.user.role === 'admin' && (!user.multiFactor || user.multiFactor.enrolledFactors.length === 0)) {
        res.status(401);
        throw new Error('Multi-factor authentication required for admin access');
    }
    
    next();
});

// Require phone verification for certain routes
const requirePhoneVerification = asyncHandler(async (req, res, next) => {
    if (!req.user.phoneNumber) {
        res.status(401);
        throw new Error('Phone verification required');
    }
    next();
});

// Require email verification
const requireEmailVerification = asyncHandler(async (req, res, next) => {
    if (!req.user.emailVerified) {
        res.status(401);
        throw new Error('Email verification required');
    }
    next();
});

module.exports = {
    requireMultiFactorAuth,
    requirePhoneVerification,
    requireEmailVerification
};
