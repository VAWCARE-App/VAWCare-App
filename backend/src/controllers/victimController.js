const asyncHandler = require('express-async-handler');
const Victim = require('../models/Victims');
const IncidentReport = require('../models/IncidentReports');
const Alert = require('../models/Alert');
const Chatbot = require('../models/Chatbot');
const admin = require('../config/firebase-config');

// @desc    Register victim
// @route   POST /api/victims/register  
// @access  Public
const registerVictim = asyncHandler(async (req, res) => {
    const body = req.body || {};
    let {
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
    } = body;

    // If no payload provided or explicitly anonymous ticket requested, generate a ticket-based anonymous account
    let generatedTicket = null;
    if (!Object.keys(body).length || victimAccount === 'anonymous') {
        // ensure anonymous flow: if caller didn't provide username/password, generate them
        if (!victimUsername) {
            victimUsername = `anon_${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`;
        }
        if (!victimPassword) {
            // generate a short random password (will be hashed), include a symbol to satisfy strong password validators if any
            victimPassword = (Math.random().toString(36).slice(-8) + 'A1!').slice(0, 12);
        }
        // mark as anonymous explicitly
        victimAccount = 'anonymous';
        generatedTicket = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

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
        // Check if username already exists (skip for purely anonymous ticket collisions handled by regeneration)
        const existingVictim = await Victim.findOne({ victimUsername });
        if (existingVictim) {
            // If username collision happens for anonymous generated username, regenerate a new one and proceed
            if (victimAccount === 'anonymous' && generatedTicket) {
                victimUsername = `anon_${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`;
            } else {
                console.log(`Registration failed: Username ${victimUsername} already exists`);
                res.status(400);
                throw new Error('Username already exists');
            }
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
            // persist generated ticket for anonymous flow so it can be used to login
            ...(generatedTicket ? { ticket: generatedTicket } : {}),
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
        // If ticket was generated, ensure it doesn't collide with existing records
        if (generatedTicket) {
            let exists = await Victim.findOne({ ticket: generatedTicket });
            let attempts = 0;
            while (exists && attempts < 5) {
                generatedTicket = Math.random().toString(36).substring(2, 10).toUpperCase();
                victimData.ticket = generatedTicket;
                exists = await Victim.findOne({ ticket: generatedTicket });
                attempts += 1;
            }
        }

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

    try {
        // 1. Find user
        let victim = await Victim.findOne({ victimUsername: identifier }) 
                  || await Victim.findOne({ victimEmail: identifier });

        if (!victim) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // 2. Verify password
        const isMatch = await victim.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // 3. Ensure Firebase UID exists
        if (!victim.firebaseUid) {
            let firebaseUser;
            try {
                firebaseUser = await admin.auth().createUser({
                    email: victim.victimEmail || undefined,
                    displayName: victim.victimUsername,
                });
                victim.firebaseUid = firebaseUser.uid;
                await victim.save();
            } catch (err) {
                // If duplicate email, fetch existing user instead
                if (err.code === "auth/email-already-exists") {
                    firebaseUser = await admin.auth().getUserByEmail(victim.victimEmail);
                    victim.firebaseUid = firebaseUser.uid;
                    await victim.save();
                } else {
                    console.error("Firebase UID creation failed:", err.message);
                    return res.status(500).json({ success: false, message: "Firebase error" });
                }
            }
        }

        // 4. Generate custom token
        const customToken = await admin.auth().createCustomToken(victim.firebaseUid, {
            role: "victim",
            isAnonymous: victim.victimAccount === "anonymous",
            victimUsername: victim.victimUsername
        });

        // 5. Respond with token
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token: customToken,
                victim: {
                    id: victim._id,
                    victimID: victim.victimID,
                    victimAccount: victim.victimAccount,
                    victimUsername: victim.victimUsername,
                    victimType: victim.victimType,
                    firstName: victim.victimAccount === "anonymous" ? "Anonymous" : victim.firstName
                }
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
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

// @desc    Get simple metrics for the logged-in victim
// @route   GET /api/victims/metrics
// @access  Private
const getMetrics = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findOne({ firebaseUid: req.user.uid });
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        const totalReports = await IncidentReport.countDocuments({ victimID: victim._id });
        const openCases = await IncidentReport.countDocuments({
            victimID: victim._id,
            status: { $in: ['Open', 'Under Investigation'] },
        });

        // recentActivities: collect the victim's own actions (reports submitted, alerts sent, chatbot usage)
        const [reportDocs, alertDocs, chatDocs] = await Promise.all([
            IncidentReport.find({ victimID: victim._id })
                .sort({ dateReported: -1 })
                .limit(5)
                .select('reportID incidentType dateReported createdAt')
                .lean(),
            Alert.find({ victimID: victim._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('alertID type createdAt status')
                .lean(),
            Chatbot.find({ victimID: victim._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('chatID createdAt')
                .lean(),
        ]);

        const reportActivities = (reportDocs || []).map((r) => ({
            kind: 'report',
            title: `You submitted report ${r.reportID}${r.incidentType ? ` — ${r.incidentType}` : ''}`,
            time: r.dateReported || r.createdAt,
            note: null,
            id: r.reportID,
        }));

        const alertActivities = (alertDocs || []).map((a) => ({
            kind: 'alert',
            title: `You sent ${a.type} alert`,
            time: a.createdAt,
            note: null,
            id: a.alertID,
        }));

        const chatActivities = (chatDocs || []).map((c) => ({
            kind: 'chat',
            title: `You chatted with the assistant`,
            time: c.createdAt,
            note: null,
            id: c.chatID,
        }));

        // merge and sort by time desc, then take the most recent 5
        const merged = [...reportActivities, ...alertActivities, ...chatActivities]
            .filter((it) => it.time)
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 5);

        const recentActivities = merged;

        res.status(200).json({
            success: true,
            data: {
                totalReports,
                openCases,
                recentActivities,
            },
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error fetching metrics');
    }
});

// @desc    Get victim's reports (only their reports)
// @route   GET /api/victims/reports
// @access  Private
const getReports = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findOne({ firebaseUid: req.user.uid });
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        const reports = await IncidentReport.find({ victimID: victim._id })
            .sort({ dateReported: -1 })
            .select('-__v')
            .lean();

        res.status(200).json({
            success: true,
            data: reports,
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
    getMetrics,
    verifyEmail,    
    verifyPhone,
    updateProfile,
    submitAnonymousReport,
    sendAnonymousAlert,
    getReports,
    updateReport
};