const admin = require('../config/firebase-config');
const Victim = require('../models/Victims');
const asyncHandler = require('express-async-handler');

// @desc    Register a new victim
// @route   POST /api/victims/register
// @access  Public
const registerVictim = asyncHandler(async (req, res) => {
    const {
        email,
        password,
        firstName,
        middleInitial,
        lastName,
        address,
        contactNumber,
        victimType,
        isAnonymous,
        emergencyContacts,
        location
    } = req.body;

    // Check if victim exists
    const existingVictim = await Victim.findOne({ email });
    if (existingVictim) {
        res.status(400);
        throw new Error('Victim already exists');
    }

    try {
        // Create user in Firebase
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: `${firstName} ${lastName}`,
            emailVerified: false // They'll need to verify their email
        });

        // Create custom claims for the user
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            role: 'victim',
            isAnonymous: isAnonymous || false
        });

        // Create victim in MongoDB
        const victim = await Victim.create({
            firebaseUid: userRecord.uid,
            email,
            firstName,
            middleInitial,
            lastName,
            address,
            contactNumber,
            victimType,
            isAnonymous: isAnonymous || false,
            emergencyContacts: emergencyContacts || [],
            location
        });

        // Create custom token for initial sign-in
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

        res.status(201).json({
            success: true,
            message: 'Victim registered successfully',
            data: {
                token: customToken,
                victim: {
                    id: victim._id,
                    firebaseUid: victim.firebaseUid,
                    email: victim.email,
                    firstName: victim.firstName,
                    lastName: victim.lastName,
                    isAnonymous: victim.isAnonymous
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

// @desc    Login victim
// @route   POST /api/victims/login
// @access  Public
const loginVictim = asyncHandler(async (req, res) => {
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

// @desc    Get victim profile
// @route   GET /api/victims/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
    const victim = await Victim.findOne({ firebaseUid: req.user.uid });

    if (victim) {
        res.status(200).json({
            success: true,
            data: {
                id: victim._id,
                firebaseUid: victim.firebaseUid,
                email: victim.email,
                firstName: victim.firstName,
                middleInitial: victim.middleInitial,
                lastName: victim.lastName,
                address: victim.address,
                contactNumber: victim.contactNumber,
                victimType: victim.victimType,
                isAnonymous: victim.isAnonymous,
                emergencyContacts: victim.emergencyContacts,
                location: victim.location
            }
        });
    } else {
        res.status(404);
        throw new Error('Victim not found');
    }
});

module.exports = {
    registerVictim,
    loginVictim,
    getProfile
};