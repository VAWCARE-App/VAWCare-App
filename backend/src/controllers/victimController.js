const asyncHandler = require('express-async-handler');
const Victim = require('../models/Victims');
const admin = require('../config/firebase-config');

// @desc    Register victim
// @route   POST /api/victims/register  
// @access  Public
const registerVictim = asyncHandler(async (req, res) => {
    const {
        victimUsername,
        victimPassword,
        victimAccount = 'anonymous',
        victimType,
        victimEmail,
        firstName,
        middleInitial,
        lastName,
        address,
        contactNumber,
        emergencyContacts,
        location
    } = req.body;

    console.log('\n=== Starting Victim Registration Process ===');
    console.log('Request Body:', {
        victimUsername,
        victimPassword: '***HIDDEN***',
        victimAccount,
        victimType,
        victimEmail,
        firstName
    });

    try {
        // Check if username already exists
        const existingVictim = await Victim.findOne({ victimUsername });
        if (existingVictim) {
            console.log(`Registration failed: Username ${victimUsername} already exists`);
            res.status(400);
            throw new Error('Username already exists');
        }

        // For regular accounts, check if email already exists
        if (victimAccount === 'regular' && victimEmail) {
            const existingEmail = await Victim.findOne({ victimEmail });
            if (existingEmail) {
                console.log(`Registration failed: Email ${victimEmail} already exists`);
                res.status(400);
                throw new Error('Email already registered');
            }
        }

        console.log(`Attempting to register new ${victimAccount} victim:`);
        console.log('- Username:', victimUsername);
        console.log('- Account Type:', victimAccount);
        console.log('- Email:', victimEmail || 'Not provided');
        console.log('- Victim Type:', victimType || 'Not specified');

        // Create victim data object
        const victimData = {
            victimAccount,
            victimUsername,
            victimPassword, // This will be hashed by the pre-save middleware
            firstName: firstName || (victimAccount === 'anonymous' ? 'Anonymous' : undefined),
            middleInitial: middleInitial || '',
            lastName: lastName || (victimAccount === 'anonymous' ? 'User' : undefined),
            address: address || (victimAccount === 'anonymous' ? '' : undefined),
            contactNumber: contactNumber || (victimAccount === 'anonymous' ? '' : undefined),
            location: location || { lat: 0, lng: 0 },
            firebaseUid: null
        };

        // Add optional fields for regular accounts
        if (victimAccount === 'regular') {
            victimData.victimType = victimType;
            victimData.victimEmail = victimEmail;
            victimData.emergencyContacts = emergencyContacts || [];
        }

        console.log('Creating victim document with the following data:');
        console.log(JSON.stringify({...victimData, victimPassword: '***HIDDEN***'}, null, 2));

        console.log(`Creating new ${victimAccount} victim record...`);
        const victim = new Victim(victimData);
        await victim.save(); // This triggers the pre-save middleware for password hashing

        console.log('\nMongoDB Registration Success:');
        console.log('- Victim ID:', victim._id);
        console.log('- VictimID:', victim.victimID);
        console.log('- Username:', victim.victimUsername);
        console.log('- Account Type:', victim.victimAccount);

        // Try Firebase user creation (optional)
        console.log('\nAttempting Firebase user creation...');
        let firebaseUid = null;
        let customToken = null;

        try {
            if (admin && admin.auth) {
                if (victimAccount === 'regular' && victimEmail) {
                    const userRecord = await admin.auth().createUser({
                        email: victimEmail,
                        password: victimPassword,
                        displayName: `${firstName} ${lastName}`,
                        emailVerified: false
                    });
                    firebaseUid = userRecord.uid;

                    await admin.auth().setCustomUserClaims(userRecord.uid, {
                        role: 'victim',
                        isAnonymous: false
                    });
                } else {
                    const userRecord = await admin.auth().createUser({
                        displayName: `Anonymous User`,
                        password: victimPassword
                    });
                    firebaseUid = userRecord.uid;

                    await admin.auth().setCustomUserClaims(userRecord.uid, {
                        role: 'victim',
                        isAnonymous: true,
                        victimUsername: victimUsername
                    });
                }

                customToken = await admin.auth().createCustomToken(firebaseUid);

                victim.firebaseUid = firebaseUid;
                await victim.save();

                console.log('\nFirebase User Created Successfully:');
                console.log('- Firebase UID:', firebaseUid);
                console.log('- Custom Token Generated:', customToken ? 'Yes' : 'No');
            }
        } catch (firebaseError) {
            console.log('\nFirebase Error:', firebaseError.message);
            console.log('Continuing without Firebase - MongoDB user is still valid');
        }

        console.log('\n=== Registration Complete ===');
        console.log('Final victim state:', {
            id: victim._id,
            victimID: victim.victimID,
            username: victim.victimUsername,
            accountType: victim.victimAccount,
            firebaseUid: victim.firebaseUid || 'Not created'
        });

        res.status(201).json({
            success: true,
            message: 'Victim registered successfully',
            data: {
                token: customToken,
                victim: {
                    id: victim._id,
                    victimID: victim.victimID,
                    victimAccount: victim.victimAccount,
                    victimUsername: victim.victimUsername,
                    firebaseUid: victim.firebaseUid,
                    firstName: victim.firstName
                }
            }
        });
    } catch (error) {
        console.log('\n=== Registration Error ===');
        console.log('Error Code:', error.code || 'No error code');
        console.log('Error Message:', error.message);

        if (error.code === 'auth/email-already-exists') {
            res.status(400);
            throw new Error('Email already registered');
        }

        if (error.code === 11000) {
            console.log('Duplicate Key Details:', error.keyPattern);
            console.log('Duplicate Key Value:', error.keyValue);
        }

        throw error;
    }
});

// @desc    Login victim
// @route   POST /api/victims/login
// @access  Public
const loginVictim = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    console.log('\n=== Starting Victim Login Process ===');
    console.log('Login attempt for identifier:', identifier);

    try {
        // First try to find user by username
        let victim = await Victim.findOne({ victimUsername: identifier });
        
        // If not found by username, try email (for regular users)
        if (!victim) {
            victim = await Victim.findOne({ victimEmail: identifier });
        }

        if (!victim) {
            console.log('Login failed: User not found');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        console.log('Found user:', {
            id: victim._id,
            username: victim.victimUsername,
            accountType: victim.victimAccount
        });

        // Check password using comparePassword method
        const isMatch = await victim.comparePassword(password);
        console.log('Password comparison result:', isMatch);

        if (!isMatch) {
            console.log('Login failed: Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        let customToken = null;
        
        // Try Firebase operations if firebaseUid exists
        if (victim.firebaseUid) {
            try {
                if (admin && admin.auth) {
                    const firebaseUser = await admin.auth().getUser(victim.firebaseUid);
                    customToken = await admin.auth().createCustomToken(victim.firebaseUid, {
                        role: 'victim',
                        isAnonymous: victim.victimAccount === 'anonymous',
                        victimUsername: victim.victimUsername
                    });
                    console.log('Firebase token created successfully');
                }
            } catch (error) {
                console.error('Firebase operation error:', error.message);
            }
        }

        console.log('\n=== Login Successful ===');

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token: customToken,
                victim: {
                    id: victim._id,
                    victimID: victim.victimID,
                    victimAccount: victim.victimAccount,
                    victimUsername: victim.victimUsername,
                    victimType: victim.victimType,
                    firstName: victim.victimAccount === 'anonymous' ? 'Anonymous' : victim.firstName
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error.message);
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
                victimID: victim.victimID,
                firebaseUid: victim.firebaseUid,
                victimEmail: victim.victimEmail,
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

// @desc    Verify email address
// @route   POST /api/victims/verify-email
// @access  Private
const verifyEmail = asyncHandler(async (req, res) => {
    const { code } = req.body;
    
    try {
        if (admin && admin.auth) {
            const firebaseUser = await admin.auth().getUser(req.user.uid);
            
            await admin.auth().updateUser(req.user.uid, {
                emailVerified: true
            });
        }

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
        if (admin && admin.auth) {
            await admin.auth().updateUser(req.user.uid, {
                phoneNumber: phoneNumber
            });
        }

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

// @desc    Submit anonymous report
// @route   POST /api/victims/anonymous/report
// @access  Public
const submitAnonymousReport = asyncHandler(async (req, res) => {
    const { incident, location, description } = req.body;

    try {
        let anonymousUser;
        
        if (admin && admin.auth) {
            anonymousUser = await admin.auth().createUser({
                disabled: false,
                emailVerified: false
            });

            await admin.auth().setCustomUserClaims(anonymousUser.uid, {
                role: 'victim',
                isAnonymous: true
            });
        }

        // Save the victim record and include firebaseUid
        const victim = await Victim.create({
            firebaseUid: anonymousUser?.uid || null,
            isAnonymous: true,
            location: location || {}
        });

        // Generate a custom token for the anonymous Firebase user so the frontend can sign them in
        let anonymousCustomToken = null;
        if (anonymousUser && admin && admin.auth) {
            try {
                anonymousCustomToken = await admin.auth().createCustomToken(anonymousUser.uid, {
                    role: 'victim',
                    isAnonymous: true
                });
            } catch (tokenErr) {
                console.error('Failed to create custom token for anonymous user:', tokenErr);
            }
        }

        const report = {
            victimId: victim._id,
            incident,
            description,
            location,
            isAnonymous: true,
            submittedAt: new Date()
        };

        // Log anonymous report submission details
        try {
            console.log(`Anonymous report submitted. reportId=${report._id} firebaseUid=${anonymousUser?.uid || 'N/A'} tokenProvided=${anonymousCustomToken ? 'yes' : 'no'}`);
        } catch (logErr) {
            console.warn('Could not log anonymous report submission:', logErr);
        }

        res.status(201).json({
            success: true,
            message: 'Anonymous report submitted successfully',
            data: {
                reportId: report._id,
                trackingNumber: Math.random().toString(36).substring(7).toUpperCase(),
                token: anonymousCustomToken
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
        const alert = {
            location,
            alertType,
            isAnonymous: true,
            timestamp: new Date()
        };

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

        const reports = [];

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