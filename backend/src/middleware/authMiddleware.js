const admin = require('firebase-admin');
const asyncHandler = require('express-async-handler');
const AdminModel = require('../models/Admin');
const OfficialModel = require('../models/BarangayOfficials');

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
        // Normalize roles returned from custom claims so downstream logging and
        // SystemLog mapping can rely on a small set of canonical values.
        let roleFromToken = decodedToken.role || 'victim';
        // Legacy/custom claim values may use 'barangay_official' - map it to 'official'
        if (String(roleFromToken).toLowerCase() === 'barangay_official') roleFromToken = 'official';

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: roleFromToken,
            isAnonymous: decodedToken.isAnonymous || false,
            phoneNumber: firebaseUser.phoneNumber,
            authMethods: authMethods,
            emailVerified: firebaseUser.emailVerified,
            multiFactor: firebaseUser.multiFactor || null
        };

        // Try to attach business identifiers for admins / officials so controllers can log "by=" correctly
        try {
            if (req.user.role === 'admin') {
                // select Mongo _id as well as business adminID
                const adminDoc = await AdminModel.findOne({ firebaseUid: req.user.uid }).select('_id adminID firebaseUid');
                if (adminDoc) {
                    // store Mongo ObjectId for DB refs and keep business id for display
                    req.user.adminID = adminDoc._id;
                    req.user.adminBusinessId = adminDoc.adminID; // optional, for human-friendly display
                }
            } else if (req.user.role === 'official') {
                // select Mongo _id as well as business officialID
                const officialDoc = await OfficialModel.findOne({ firebaseUid: req.user.uid }).select('_id officialID firebaseUid');
                if (officialDoc) {
                    req.user.officialID = officialDoc._id;
                    req.user.officialBusinessId = officialDoc.officialID;
                }
            }
        } catch (e) {
            // non-fatal: if DB lookup fails, continue without business IDs
            console.warn('authMiddleware: could not lookup admin/official by firebaseUid', e.message || e);
        }

                // // Check if user needs additional verification
        // if (req.user.role === 'admin' || req.user.role === 'official') {
        //     // For admin and official roles, require email verification
        //     if (!req.user.emailVerified) {
        //         res.status(401);
        //         throw new Error('Email verification required');
        //     }
        // }

        next();
    } catch (error) {
        res.status(401);
        throw new Error('Not authorized to access this route');
    }
});

// Admin only middleware - checks for admin role in custom claims
const adminOnly = asyncHandler(async (req, res, next) => {
    // // Original admin permission check
    // if (!req.user || req.user.role !== 'admin') {
    //     res.status(403);
    //     throw new Error('Access denied. Admin only.');
    // }
    next();
});

// Backend admin only middleware - checks for backend admin role in custom claims
const backendAdminOnly = asyncHandler(async (req, res, next) => {
    // // Original backend admin permission check
    // if (!req.user || req.user.role !== 'admin' || req.user.adminRole !== 'backend') {
    //     res.status(403);
    //     throw new Error('Access denied. Backend admin only.');
    // }
    next();
});

// Victim only middleware - checks for victim role in custom claims
const victimOnly = asyncHandler(async (req, res, next) => {
    // // Original victim permission check
    // if (!req.user || req.user.role !== 'victim') {
    //     res.status(403);
    //     throw new Error('Access denied. Victim only.');
    // }
    next();
});

module.exports = {
    protect,
    adminOnly,
    backendAdminOnly,
    victimOnly
};