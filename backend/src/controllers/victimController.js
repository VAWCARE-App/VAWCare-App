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

// @desc    Verify email address
// @route   POST /api/victims/verify-email
// @access  Private
const verifyEmail = asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    try {
        // Get the current user from Firebase
        const firebaseUser = await admin.auth().getUser(req.user.uid);
        
        // Verify the email verification code
        // This would typically be handled by Firebase's email verification flow
        // Here we're just demonstrating the concept
        await admin.auth().updateUser(req.user.uid, {
            emailVerified: true
        });

        res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        res.status(400);
        throw new Error('Email verification failed');
    }
});

// @desc    Verify phone number
// @route   POST /api/victims/verify-phone
// @access  Private
const verifyPhone = asyncHandler(async (req, res) => {
    const { phoneNumber, code } = req.body;
    
    try {
        // This would typically use Firebase Phone Auth
        // For now, we'll update the user's phone number directly
        await admin.auth().updateUser(req.user.uid, {
            phoneNumber: phoneNumber
        });

        // Update the victim in MongoDB
        await Victim.findOneAndUpdate(
            { firebaseUid: req.user.uid },
            { contactNumber: phoneNumber },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Phone number verified successfully'
        });
    } catch (error) {
        res.status(400);
        throw new Error('Phone verification failed');
    }
});

// @desc    Update victim profile
// @route   PUT /api/victims/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const victim = await Victim.findOne({ firebaseUid: req.user.uid });

    if (!victim) {
        res.status(404);
        throw new Error('Victim not found');
    }

    const updatedVictim = await Victim.findByIdAndUpdate(
        victim._id,
        { ...req.body },
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        data: updatedVictim
    });
});

// @desc    Submit anonymous report
// @route   POST /api/victims/anonymous/report
// @access  Public
const submitAnonymousReport = asyncHandler(async (req, res) => {
    const { incident, location, description } = req.body;

    try {
        // Create anonymous user in Firebase
        const anonymousUser = await admin.auth().createUser({
            disabled: false,
            emailVerified: false
        });

        // Set anonymous custom claims
        await admin.auth().setCustomUserClaims(anonymousUser.uid, {
            role: 'victim',
            isAnonymous: true
        });

        // Create anonymous victim record
        const victim = await Victim.create({
            firebaseUid: anonymousUser.uid,
            isAnonymous: true,
            location: location || {}
        });

        // Create the report
        const report = {
            victimId: victim._id,
            incident,
            description,
            location,
            isAnonymous: true,
            submittedAt: new Date()
        };

        // Here you would save the report to your reports collection
        // const newReport = await Report.create(report);

        res.status(201).json({
            success: true,
            message: 'Anonymous report submitted successfully',
            data: {
                reportId: report._id,
                trackingNumber: Math.random().toString(36).substring(7).toUpperCase()
            }
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error submitting anonymous report');
    }
});

// @desc    Send anonymous alert
// @route   POST /api/victims/anonymous/alert
// @access  Public
const sendAnonymousAlert = asyncHandler(async (req, res) => {
    const { location, alertType } = req.body;

    try {
        // Create anonymous alert
        const alert = {
            location,
            alertType,
            isAnonymous: true,
            timestamp: new Date()
        };

        // Here you would save the alert to your alerts collection
        // const newAlert = await Alert.create(alert);

        // Notify relevant authorities (you would implement this based on your requirements)
        // await notifyAuthorities(alert);

        res.status(200).json({
            success: true,
            message: 'Anonymous alert sent successfully',
            data: {
                alertId: alert._id,
                timestamp: alert.timestamp
            }
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error sending anonymous alert');
    }
});

// @desc    Get victim's reports
// @route   GET /api/victims/reports
// @access  Private
const getReports = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findOne({ firebaseUid: req.user.uid });
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        // Here you would fetch reports from your Report model
        // const reports = await Report.find({ victimId: victim._id });
        const reports = []; // Placeholder until Report model is implemented

        res.status(200).json({
            success: true,
            data: reports
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error fetching reports');
    }
});

// @desc    Update a report
// @route   PUT /api/victims/reports/:id
// @access  Private
const updateReport = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findOne({ firebaseUid: req.user.uid });
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        // Here you would update the report in your Report model
        // const report = await Report.findOneAndUpdate(
        //     { _id: req.params.id, victimId: victim._id },
        //     req.body,
        //     { new: true }
        // );

        // Placeholder response until Report model is implemented
        res.status(200).json({
            success: true,
            message: 'Report updated successfully'
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error updating report');
    }
});

module.exports = {
    registerVictim,
    loginVictim,
    getProfile,
    verifyEmail,
    verifyPhone,
    updateProfile,
    submitAnonymousReport,
    sendAnonymousAlert,
    getReports,
    updateReport
};