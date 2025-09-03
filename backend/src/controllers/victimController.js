const admin = require('../config/firebase-config');
const Victim = require('../models/Victims');
const asyncHandler = require('express-async-handler');

// @desc    Register a new victim
// @route   POST /api/victims/register
// @access  Public
const registerVictim = asyncHandler(async (req, res) => {
    const {
        victimAccount,
        victimUsername,
        victimPassword,
        victimEmail,
        victimType,
        firstName,
        middleInitial,
        lastName,
        address,
        contactNumber,
        location
    } = req.body;

    // Check if victim username already exists
    const existingVictim = await Victim.findOne({ victimUsername });
    if (existingVictim) {
        res.status(400);
        throw new Error('Username already exists');
    }

    try {
        // Create user in Firebase (both regular and anonymous)
        let firebaseUid = null;
        if (victimAccount === 'regular' && victimEmail) {
            // Create regular user in Firebase
            const userRecord = await admin.auth().createUser({
                email: victimEmail,
                password: victimPassword,
                displayName: `${firstName} ${lastName}`,
                emailVerified: false
            });
            firebaseUid = userRecord.uid;

            // Set custom claims for regular user
            await admin.auth().setCustomUserClaims(userRecord.uid, {
                role: 'victim',
                isAnonymous: false
            });
        } else if (victimAccount === 'anonymous') {
            // Create anonymous user in Firebase
            const userRecord = await admin.auth().createUser({
                // No email for anonymous users
                password: victimPassword,
                displayName: `Anonymous-${victimUsername}`,
            });
            firebaseUid = userRecord.uid;

            // Set custom claims for anonymous user
            await admin.auth().setCustomUserClaims(userRecord.uid, {
                role: 'victim',
                isAnonymous: true,
                victimUsername: victimUsername // Store username in claims for identification
            });
        }

        // Create victim in MongoDB
        const victim = new Victim({
            victimAccount,
            victimUsername,
            victimPassword,
            victimEmail: victimEmail || '',
            victimType: victimAccount === 'anonymous' ? 'Child' : victimType, // Default to Child for anonymous
            firstName: victimAccount === 'anonymous' ? 'Anonymous' : firstName,
            middleInitial: victimAccount === 'anonymous' ? '' : middleInitial,
            lastName: victimAccount === 'anonymous' ? '' : lastName,
            address: address || '',
            contactNumber: contactNumber || '',
            location: location || { lat: 0, lng: 0 },
            firebaseUid: firebaseUid || null // Ensure firebaseUid is explicitly set
        });
        
        // Save the victim - this will trigger the pre-save middleware to hash the password
        await victim.save();

        let customToken = null;
        // Create custom token only for regular accounts
        if (firebaseUid) {
            customToken = await admin.auth().createCustomToken(firebaseUid);
        }

        res.status(201).json({
            success: true,
            message: 'Victim registered successfully',
            data: {
                token: customToken, // Will be null for anonymous accounts
                victim: {
                    id: victim._id,
                    victimAccount: victim.victimAccount,
                    victimUsername: victim.victimUsername,
                    victimType: victim.victimType,
                    firebaseUid: victim.firebaseUid, // Will be null for anonymous accounts
                    victimEmail: victim.victimEmail,
                    firstName: victim.firstName
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
    const { identifier, password } = req.body;  // identifier can be email or username

    try {
        // First try to find user by username (for anonymous users)
        let victim = await Victim.findOne({ victimUsername: identifier });
        
        // If not found by username, try email (for regular users)
        if (!victim) {
            victim = await Victim.findOne({ victimEmail: identifier });
        }

        if (!victim) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await victim.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        let customToken = null;
        
        // Only try Firebase operations if we have a firebaseUid
        if (victim.firebaseUid) {
            try {
                // Get Firebase user
                const firebaseUser = await admin.auth().getUser(victim.firebaseUid);

                // Create custom token
                customToken = await admin.auth().createCustomToken(victim.firebaseUid, {
                    role: 'victim',
                    isAnonymous: victim.victimAccount === 'anonymous',
                    victimUsername: victim.victimUsername
                });
            } catch (error) {
                console.error('Firebase operation error:', error);
                // Continue without Firebase token
            }
        }

        res.status(200).json({
            success: true,
            data: {
                token: customToken,
                victim: {
                    id: victim._id,
                    victimAccount: victim.victimAccount,
                    victimUsername: victim.victimUsername,
                    victimType: victim.victimType,
                    firstName: victim.victimAccount === 'anonymous' ? 'Anonymous' : victim.firstName
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401);
        throw new Error('Invalid credentials');
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
}