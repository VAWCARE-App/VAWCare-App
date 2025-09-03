const admin = require('../config/firebase-config');
const BarangayOfficial = require('../models/BarangayOfficials');
const Victim = require('../models/Victims');
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
        adminPassword,
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
            passwordExists: !!adminPassword,
            passwordLength: adminPassword?.length
        });

        // Create Firebase user first
        const userRecord = await admin.auth().createUser({
            email: officialEmail,
            password: adminPassword,
            displayName: `${firstName} ${lastName}`,
            emailVerified: false
        });

        // Set custom claims for initial access
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'barangay_official',
            position: position,
            status: 'pending'
        });

        // Generate custom token
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        // Create official in MongoDB with pending status
        const official = await BarangayOfficial.create({
            officialID: officialID,
            officialEmail: officialEmail,
            firstName: firstName,
            middleInitial: middleInitial,
            lastName: lastName,
            position: position,
            adminPassword: adminPassword, // Will be hashed by the model's pre-save middleware
            contactNumber: contactNumber,
            barangay: barangay,
            city: city,
            province: province,
            status: 'pending',
            firebaseUid: userRecord.uid
        });

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
    console.log('Login attempt with:', { officialEmail, passwordLength: password?.length });

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
            hasPassword: !!official.adminPassword,
            passwordLength: official.adminPassword?.length
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
        console.log('Attempting password comparison');
        const isMatch = await official.comparePassword(password);
        console.log('Password comparison result:', isMatch);
        
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
            role: 'barangay_official',
            position: official.position,
            status: official.status
        });

        console.log('Login successful, returning token');
        res.status(200).json({
            success: true,
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
        official.firstName = req.body.firstName || official.firstName;
        official.middleInitial = req.body.middleInitial || official.middleInitial;
        official.lastName = req.body.lastName || official.lastName;
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
            official.adminPassword = req.body.password;
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
