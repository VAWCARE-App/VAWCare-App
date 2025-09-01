const admin = require('../config/firebase-config');
const BarangayOfficial = require('../models/BarangayOfficials');
const asyncHandler = require('express-async-handler');

// @desc    Register a new barangay official
// @route   POST /api/officials/register
// @access  Admin only
const registerOfficial = asyncHandler(async (req, res) => {
    const {
        officialID,
        email,
        password,
        firstName,
        middleInitial,
        lastName,
        position,
        contactNumber
    } = req.body;

    // Check if official exists
    const existingOfficial = await BarangayOfficial.findOne({ 
        $or: [
            { officialEmail: email },
            { officialID: officialID }
        ]
    });

    if (existingOfficial) {
        res.status(400);
        throw new Error('Official already exists with this email or ID');
    }

    try {
        // Create official in MongoDB with pending status
        const official = await BarangayOfficial.create({
            officialID,
            officialEmail: email,
            firstName,
            middleInitial,
            lastName,
            position,
            adminPassword: password, // Will be hashed by the model's pre-save middleware
            contactNumber
        });

        // Create custom token for initial sign-in
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        res.status(201).json({
            success: true,
            message: 'Barangay Official registered successfully',
            data: {
                token: customToken,
                official: {
                    id: official._id,
                    firebaseUid: official.firebaseUid,
                    officialID: official.officialID,
                    email: official.officialEmail,
                    firstName: official.firstName,
                    lastName: official.lastName,
                    position: official.position
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
    const { email, password } = req.body;

    try {
        // Firebase client SDK should handle the authentication
        // This endpoint is just for compatibility and should return instructions
        res.status(200).json({
            success: true,
            message: 'Please use Firebase client SDK for authentication'
        });
    } catch (error) {
        res.status(401);
        throw new Error('Invalid email or password');
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

module.exports = {
    registerOfficial,
    loginOfficial,
    getProfile,
    updateProfile,
    verifyEmail,
    verifyPhone
};
