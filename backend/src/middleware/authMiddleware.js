const admin = require('firebase-admin');
const asyncHandler = require('express-async-handler');
const AdminModel = require('../models/Admin');
const OfficialModel = require('../models/BarangayOfficials');

const protect = asyncHandler(async (req, res, next) => {
    let token;

    // First, try to get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    // If no token in header, try to get from HttpOnly cookie
    if (!token && req.cookies && req.cookies.authToken) {
        token = req.cookies.authToken;
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized to access this route');
    }

    try {
        // Verify token with Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(token);
        const firebaseUser = await admin.auth().getUser(decodedToken.uid);

        let roleFromToken = decodedToken.role || 'victim';
        if (String(roleFromToken).toLowerCase() === 'barangay_official') roleFromToken = 'official';

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: roleFromToken,
            isAnonymous: decodedToken.isAnonymous || false,
            phoneNumber: firebaseUser.phoneNumber,
            emailVerified: firebaseUser.emailVerified
        };

        // Attach business IDs for admins or officials
        if (req.user.role === 'admin') {
            const adminDoc = await AdminModel.findOne({ firebaseUid: req.user.uid }).select('_id adminID');
            if (adminDoc) {
                req.user.adminID = adminDoc._id;
                req.user.adminBusinessId = adminDoc.adminID;
            }
        } else if (req.user.role === 'official') {
            const officialDoc = await OfficialModel.findOne({ firebaseUid: req.user.uid }).select('_id officialID');
            if (officialDoc) {
                req.user.officialID = officialDoc._id;
                req.user.officialBusinessId = officialDoc.officialID;
            }
        }

        next();
    } catch (error) {
        res.status(401);
        throw new Error('Not authorized to access this route');
    }
});

// Role-based middlewares
const adminOnly = asyncHandler(async (req, res, next) => {
    if (!req.user || !['admin', 'official'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Access denied. Admin only.');
    }
    next();
});

const backendAdminOnly = asyncHandler(async (req, res, next) => {
    if (!req.user || !['admin', 'official'].includes(req.user.role)) {
        res.status(403);
        throw new Error('Access denied. Backend admin only.');
    }
    next();
});

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