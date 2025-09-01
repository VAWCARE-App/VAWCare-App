const admin = require('firebase-admin');
const asyncHandler = require('express-async-handler');

// Protect routes - verifies Firebase ID token
const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized to access this route');
    }

    try {
        // Verify token with Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Add user info to request object
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role || 'victim', // Default to victim if no role claim
            isAnonymous: decodedToken.isAnonymous || false
        };

        next();
    } catch (error) {
        res.status(401);
        throw new Error('Not authorized to access this route');
    }
});

// Admin only middleware - checks for admin role in custom claims
const adminOnly = asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403);
        throw new Error('Access denied. Admin only.');
    }
    next();
});

// Backend admin only middleware - checks for backend admin role in custom claims
const backendAdminOnly = asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin' || req.user.adminRole !== 'backend') {
        res.status(403);
        throw new Error('Access denied. Backend admin only.');
    }
    next();
});

// Victim only middleware - checks for victim role in custom claims
const victimOnly = asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== 'victim') {
        res.status(403);
        throw new Error('Access denied. Victim only.');
    }
    next();
});

module.exports = {
    protect,
    adminOnly,
    backendAdminOnly,
    victimOnly
};