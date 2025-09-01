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
        
        // Get the Firebase user
        const firebaseUser = await admin.auth().getUser(decodedToken.uid);

        // Check authentication method
        const authMethods = {
            emailPassword: !!firebaseUser.email && !firebaseUser.providerData.some(p => p.providerId === 'google.com'),
            google: firebaseUser.providerData.some(p => p.providerId === 'google.com'),
            phone: !!firebaseUser.phoneNumber,
            anonymous: firebaseUser.providerData.length === 0
        };

        // Add enhanced user info to request object
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role || 'victim',
            isAnonymous: decodedToken.isAnonymous || false,
            phoneNumber: firebaseUser.phoneNumber,
            authMethods: authMethods,
            emailVerified: firebaseUser.emailVerified,
            multiFactor: firebaseUser.multiFactor || null
        };

        // Check if user needs additional verification
        if (req.user.role === 'admin' || req.user.role === 'official') {
            // For admin and official roles, require email verification
            if (!req.user.emailVerified) {
                res.status(401);
                throw new Error('Email verification required');
            }
        }

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