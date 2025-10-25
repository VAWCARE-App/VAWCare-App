const admin = require('../config/firebase-config');
const BarangayOfficial = require('../models/BarangayOfficials');
const Victim = require('../models/Victims');
const SystemLog = require('../models/SystemLogs');
const asyncHandler = require('express-async-handler');

// @desc    Register a new barangay official
// @route   POST /api/officials/register
// @access  Admin only
// @desc    Get all victims
// @route   GET /api/officials/victims
// @access  Private (Officials only)
const getAllVictims = asyncHandler(async (req, res) => {
    try {
        const victims = await Victim.find();
        
        res.status(200).json({
            success: true,
            data: {
                victims,
                total: victims.length
            }
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error retrieving victims: ' + error.message);
    }
});

const registerOfficial = asyncHandler(async (req, res) => {
    const {
        officialID,
        officialEmail,
        officialPassword,
        firstName,
        middleInitial,
        lastName,
        position,
        contactNumber,
        barangay,
        city,
        province
    } = req.body;

    // Check if official exists
    const existingOfficial = await BarangayOfficial.findOne({ 
        $or: [
            { officialEmail: officialEmail },
            { officialID: officialID }
        ]
    });

    if (existingOfficial) {
        res.status(400);
        throw new Error('Official already exists with this email or ID');
    }

    try {
        console.log('Creating official with password:', {
            passwordExists: !!officialPassword,
            passwordLength: officialPassword?.length
        });

        // Create Firebase user first
            // Create official in MongoDB first (without firebaseUid)
            const official = await BarangayOfficial.create({
                officialID: officialID,
                officialEmail: officialEmail,
                firstName: firstName,
                middleInitial: middleInitial,
                lastName: lastName,
                position: position,
                officialPassword: officialPassword, // Will be hashed by the model's pre-save middleware
                contactNumber: contactNumber,
                barangay: barangay,
                city: city,
                province: province,
                status: 'pending',
                firebaseUid: null
            });

            // Now attempt to create Firebase user and attach UID to the created official
            let customToken = null;
            try {
                const userRecord = await admin.auth().createUser({
                    email: officialEmail,
                    password: officialPassword,
                    displayName: `${firstName} ${lastName}`,
                    emailVerified: false
                });

                // Set custom claims for initial access
                await admin.auth().setCustomUserClaims(userRecord.uid, {
                    role: 'official',
                    position: position,
                    status: 'pending'
                });

                // Generate custom token
                customToken = await admin.auth().createCustomToken(userRecord.uid);

                // Save firebaseUid on the official record
                official.firebaseUid = userRecord.uid;
                await official.save();
            } catch (firebaseErr) {
                // If Firebase creation fails, rollback the MongoDB document to avoid partial registration
                console.error('Firebase creation failed for official, rolling back MongoDB record:', firebaseErr);
                try {
                    await BarangayOfficial.findByIdAndDelete(official._id);
                } catch (delErr) {
                    console.error('Failed to delete official after Firebase error:', delErr);
                }
                res.status(500);
                throw new Error('Error creating Firebase account: ' + firebaseErr.message);
            }

        res.status(201).json({
            success: true,
            message: 'Barangay Official registered successfully. Pending admin approval.',
            data: {
                token: customToken,
                official: {
                    id: official._id,
                    officialID: official.officialID,
                    officialEmail: official.officialEmail,
                    firstName: official.firstName,
                    lastName: official.lastName,
                    position: official.position,
                    status: official.status
                }
            }
        });
        try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: req.user?.role || 'official', actorId: req.user?.officialID || null, action: 'create_official', details: `New official registered: ${official.officialID || official._id}` }); } catch(e) { console.warn('Failed to record official registration log', e && e.message); }
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            res.status(400);
            throw new Error('Email already registered');
        }
        throw error;
    }
});

// @desc    Login barangay official
// @route   POST /api/officials/login
// @access  Public
const loginOfficial = asyncHandler(async (req, res) => {
    const { officialEmail, password } = req.body;
    console.log('Login attempt for official:', { officialEmail, hasPassword: !!password });

    try {
        // First find the official in MongoDB
        console.log('Searching for official with email:', officialEmail);
        const official = await BarangayOfficial.findOne({ officialEmail });
        
        if (!official) {
            console.log('Official not found with email:', officialEmail);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        console.log('Found official:', {
            id: official._id,
            email: official.officialEmail,
            status: official.status,
            hasFirebaseUid: !!official.firebaseUid,
            hasPassword: !!official.officialPassword,
            passwordLength: official.officialPassword?.length
        });

        // Check if the account is approved
        if (official.status !== 'approved') {
            console.log('Official not approved. Current status:', official.status);
            return res.status(401).json({
                success: false,
                message: 'Your account is pending approval. Please contact the administrator.'
            });
        }

        // Verify password
    console.log('Attempting password comparison for official:', officialEmail);
    const isMatch = await official.comparePassword(password);
    console.log('Password comparison result for official:', officialEmail, isMatch);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Get Firebase user and verify their existence
        let firebaseUser;
        try {
            firebaseUser = await admin.auth().getUser(official.firebaseUid);
        } catch (error) {
            console.error('Error getting Firebase user:', error);
            if (error.code === 'auth/user-not-found') {
                return res.status(401).json({
                    success: false,
                    message: 'Account configuration error. Please contact administrator.'
                });
            }
            throw error;
        }

        // Create custom token for approved official with updated claims
        const customToken = await admin.auth().createCustomToken(official.firebaseUid, {
            role: 'official',
            position: official.position,
            status: official.status
        });

        // Set HttpOnly cookie for secure token storage
        res.cookie('authToken', customToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        console.log('Login successful for official, returning token');
        res.status(200).json({
            success: true,
            data: {
                token: customToken, // Still included for fallback/compatibility
                official: {
                    id: official._id,
                    officialID: official.officialID,
                    officialEmail: official.officialEmail,
                    firstName: official.firstName,
                    lastName: official.lastName,
                    position: official.position,
                    status: official.status
                }
            }
        });

        // record login in system logs (best-effort)
        try {
            const forwarded = (req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])) || null;
            const ipToRecord = forwarded ? String(forwarded).split(',')[0].trim() : req.ip;
            await SystemLog.createLog({
                logID: `LOG-${Date.now()}`,
                actorType: 'official',
                actorId: official._id,
                action: 'login',
                details: `Official ${official.officialID} logged in`,
                ipAddress: ipToRecord,
                timestamp: new Date()
            });
            console.log('Recorded login system log for official', official.officialID, 'ip=', ipToRecord);
        } catch (logErr) {
            console.warn('Failed to record official login system log:', logErr && logErr.message, logErr);
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(401);
        throw new Error('Invalid credentials');
    }
});

// @desc    Get official profile
// @route   GET /api/officials/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
    const official = await BarangayOfficial.findOne({ firebaseUid: req.user.uid });

    if (official) {
        res.status(200).json({
            success: true,
            data: {
                id: official._id,
                firebaseUid: official.firebaseUid,
                officialID: official.officialID,
                email: official.officialEmail,
                firstName: official.firstName,
                middleInitial: official.middleInitial,
                lastName: official.lastName,
                position: official.position,
                contactNumber: official.contactNumber
            }
        });
    } else {
        res.status(404);
        throw new Error('Barangay Official not found');
    }
});

// @desc    Update official profile
// @route   PUT /api/officials/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const official = await BarangayOfficial.findOne({ firebaseUid: req.user.uid });

    if (official) {
        // Sanitize name fields: trim and prevent stray single-character 'C' being appended
        if (req.body.firstName) official.firstName = String(req.body.firstName).trim();
        if (req.body.middleInitial !== undefined) {
            const mi = String(req.body.middleInitial || '').trim();
            official.middleInitial = mi === 'C' ? mi : mi; // keep as-is but trimmed
        }
        if (req.body.lastName) {
            let ln = String(req.body.lastName).trim();
            // If lastName ends with an accidental single uppercase 'C' separated by no space, remove it
            if (ln.length > 1 && ln.endsWith('C') && !ln.endsWith(' C')) {
                // Only remove if the trailing 'C' appears out of place (e.g., "SmithC")
                ln = ln.slice(0, -1);
            }
            official.lastName = ln;
        }
        official.contactNumber = req.body.contactNumber || official.contactNumber;

        // If email is being updated, update in Firebase too
        if (req.body.email && req.body.email !== official.officialEmail) {
            await admin.auth().updateUser(req.user.uid, {
                email: req.body.email,
                emailVerified: false
            });
            official.officialEmail = req.body.email;
        }

        // If password is being updated
        if (req.body.password) {
            await admin.auth().updateUser(req.user.uid, {
                password: req.body.password
            });
            official.officialPassword = req.body.password;
        }

        const updatedOfficial = await official.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: updatedOfficial._id,
                firebaseUid: updatedOfficial.firebaseUid,
                officialID: updatedOfficial.officialID,
                email: updatedOfficial.officialEmail,
                firstName: updatedOfficial.firstName,
                middleInitial: updatedOfficial.middleInitial,
                lastName: updatedOfficial.lastName,
                position: updatedOfficial.position,
                contactNumber: updatedOfficial.contactNumber
            }
        });
        try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: 'official', actorId: updatedOfficial._id, action: 'official_profile_updated', details: `Official profile updated ${updatedOfficial.officialID || updatedOfficial._id}` }); } catch(e) { console.warn('Failed to record official profile update log', e && e.message); }
    } else {
        res.status(404);
        throw new Error('Barangay Official not found');
    }
});

// @desc    Verify official's email
// @route   POST /api/officials/verify-email
// @access  Private
const verifyEmail = asyncHandler(async (req, res) => {
    try {
        const uid = req.user.uid;
        
        // Generate email verification link
        const emailVerificationLink = await admin.auth().generateEmailVerificationLink(req.user.email);
        
        // Update official's email verification status
        await BarangayOfficial.findOneAndUpdate(
            { firebaseUid: uid },
            { emailVerified: true }
        );

        res.status(200).json({
            success: true,
            message: 'Email verification link generated',
            data: {
                verificationLink: emailVerificationLink
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Verify official's phone number
// @route   POST /api/officials/verify-phone
// @access  Private
const verifyPhone = asyncHandler(async (req, res) => {
    try {
        const { phoneNumber, verificationCode } = req.body;
        const uid = req.user.uid;

        // Verify the phone number using Firebase
        await admin.auth().updateUser(uid, {
            phoneNumber: phoneNumber,
            // You might need to implement actual SMS verification logic here
        });

        // Update official's phone verification status
        await BarangayOfficial.findOneAndUpdate(
            { firebaseUid: uid },
            { phoneVerified: true }
        );

        res.status(200).json({
            success: true,
            message: 'Phone number verified successfully'
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Send password reset email via Firebase
// @route   POST /api/officials/forgot-password
// @access  Public
const sendPasswordResetEmail = asyncHandler(async (req, res) => {
    const { officialEmail } = req.body;

    try {
        // First check if the official exists and is approved
        const official = await BarangayOfficial.findOne({ 
            officialEmail: officialEmail,
            status: 'approved' 
        });

        if (!official || !official.firebaseUid) {
            // Don't reveal if email exists or not
            return res.status(200).json({
                success: true,
                message: 'If an account exists, you will receive a password reset email'
            });
        }

        // Generate password reset link
        const resetLink = await admin.auth().generatePasswordResetLink(officialEmail);

        // Send password reset email through Firebase
        // Firebase will automatically send the email
        await admin.auth().generatePasswordResetLink(officialEmail);

        res.status(200).json({
            success: true,
            message: 'Password reset email sent'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        // Still return 200 to not reveal if email exists
        res.status(200).json({
            success: true,
            message: 'If an account exists, you will receive a password reset email'
        });
    }
});

module.exports = {
    registerOfficial,
    loginOfficial,
    getProfile,
    updateProfile,
    verifyEmail,
    verifyPhone,
    sendPasswordResetEmail,
    getAllVictims
};
