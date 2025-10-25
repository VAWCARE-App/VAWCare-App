const admin = require('../config/firebase-config');
const Admin = require('../models/Admin');
const Victim = require('../models/Victims');
const BarangayOfficial = require('../models/BarangayOfficials');
const SystemLog = require('../models/SystemLogs');
const asyncHandler = require('express-async-handler');

// @desc    Get all users (admins, victims, and officials)
// @route   GET /api/admin/users
// @access  Private (Admin only)
// @desc    Soft delete a victim
// @route   PUT /api/admin/victims/:id/soft-delete
// @access  Private (Admin only)
exports.softDeleteVictim = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findById(req.params.id);
        
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        victim.isDeleted = true;
        await victim.save();

        res.status(200).json({
            success: true,
            message: 'Victim soft deleted successfully'
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error soft deleting victim: ' + error.message);
    }
});

// @desc    Restore a soft-deleted victim
// @route   PUT /api/admin/victims/:id/restore
// @access  Private (Admin only)
exports.restoreVictim = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findById(req.params.id);
        
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        victim.isDeleted = false;
        await victim.save();

        res.status(200).json({
            success: true,
            message: 'Victim restored successfully'
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error restoring victim: ' + error.message);
    }
});

// @desc    Soft delete an official
// @route   PUT /api/admin/officials/:id/soft-delete
// @access  Private (Admin only)
exports.softDeleteOfficial = asyncHandler(async (req, res) => {
    try {
        const official = await BarangayOfficial.findById(req.params.id);
        
        if (!official) {
            res.status(404);
            throw new Error('Official not found');
        }

        official.isDeleted = true;
        await official.save();

        res.status(200).json({
            success: true,
            message: 'Official soft deleted successfully'
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error soft deleting official: ' + error.message);
    }
});

// @desc    Restore a soft-deleted official
// @route   PUT /api/admin/officials/:id/restore
// @access  Private (Admin only)
exports.restoreOfficial = asyncHandler(async (req, res) => {
    try {
        const official = await BarangayOfficial.findById(req.params.id);
        
        if (!official) {
            res.status(404);
            throw new Error('Official not found');
        }

        official.isDeleted = false;
        await official.save();

        res.status(200).json({
            success: true,
            message: 'Official restored successfully'
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error restoring official: ' + error.message);
    }
});

exports.getAllUsers = asyncHandler(async (req, res) => {
    try {
    // Get all non-deleted users from each collection, excluding password fields
    const admins = await Admin.find({}, '-adminPassword');
        
    const victims = await Victim.find({ isDeleted: false }, '-victimPassword');
            
    const officials = await BarangayOfficial.find({ isDeleted: false }, '-officialPassword');

        res.status(200).json({
            success: true,
            data: {
                admins,
                victims,
                officials,
                total: admins.length + victims.length + officials.length
            }
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error retrieving users: ' + error.message);
    }
});

// @desc    Register a new victim
// @route   POST /api/admin/victims/register
// @access  Private (Admin only)
exports.registerVictim = asyncHandler(async (req, res) => {
    try {
        const {
            firstName,
            middleInitial,
            lastName,
            email,
            phoneNumber,
            address,
            dateOfBirth,
            gender
        } = req.body;

        console.log(`Attempting to register new victim: ${firstName} ${lastName}`);

        // Check if victim with email already exists
        const existingVictim = await Victim.findOne({ email });
        if (existingVictim) {
            console.log(`Registration failed: Victim with email ${email} already exists`);
            res.status(400);
            throw new Error('Victim with this email already exists');
        }

        console.log('Creating new victim record...');
        // Create new victim
        const victim = await Victim.create({
            firstName,
            middleInitial,
            lastName,
            email,
            phoneNumber,
            address,
            dateOfBirth,
            gender,
            isDeleted: false
        });

        console.log(`Successfully registered new victim with ID: ${victim._id}`);

        res.status(201).json({
            success: true,
            data: victim,
            message: 'Victim registered successfully'
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error registering victim: ' + error.message);
    }
});

// @desc    Update victim details
// @route   PUT /api/admin/victims/:id
// @access  Private (Admin only)
exports.updateVictim = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findById(req.params.id);
        
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        try {
            const updatedVictim = await Victim.findByIdAndUpdate(
                req.params.id,
                { ...req.body, isDeleted: victim.isDeleted }, // Preserve isDeleted status
                { new: true, runValidators: true }
            );

            res.status(200).json({
                success: true,
                data: updatedVictim,
                message: 'Victim updated successfully'
            });
            try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: 'admin', actorId: req.user?.adminID, action: 'edit_user', details: `Admin updated victim ${updatedVictim.victimID || updatedVictim._id}: ${JSON.stringify(req.body)}` }); } catch(e) { console.warn('Failed to record victim update log', e && e.message); }
        } catch (err) {
            if (err.name === 'ValidationError') {
                return res.status(400).json({ success: false, message: err.message });
            }
            if (err.code === 11000) {
                return res.status(409).json({ success: false, message: 'Duplicate field value violates unique constraint' });
            }
            throw err;
        }
    } catch (error) {
    console.error('Error in updateVictim:', error);
    res.status(500).json({ success: false, message: 'Error updating victim', error: error.message });
    }
});

// @desc    Register a new barangay official
// @route   POST /api/admin/officials/register
// @access  Private (Admin only)
exports.registerOfficial = asyncHandler(async (req, res) => {
    try {
        const {
            officialID,
            officialEmail,
            firstName,
            middleInitial,
            lastName,
            position
        } = req.body;

        console.log(`Attempting to register new official: ${firstName} ${lastName} (${position})`);

        // Check if official with email or ID already exists
        const existingOfficial = await BarangayOfficial.findOne({
            $or: [{ officialEmail }, { officialID }]
        });

        if (existingOfficial) {
            console.log(`Registration failed: Official with email ${officialEmail} or ID ${officialID} already exists`);
            res.status(400);
            throw new Error('Official with this email or ID already exists');
        }

        console.log('Creating new official record...');
        // Create new official
        const official = await BarangayOfficial.create({
            officialID,
            officialEmail,
            firstName,
            middleInitial,
            lastName,
            position,
            status: 'pending', // Default status
            isDeleted: false
        });

        console.log(`Successfully registered new official with ID: ${official._id} and officialID: ${officialID}`);

        res.status(201).json({
            success: true,
            data: official,
            message: 'Official registered successfully'
        });
        try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: 'admin', actorId: req.user?.adminID, action: 'create_official', details: `Admin created official ${official.officialID || official._id}` }); } catch(e) { console.warn('Failed to record admin official creation log', e && e.message); }
    } catch (error) {
        res.status(500);
        throw new Error('Error registering official: ' + error.message);
    }
});

// @desc    Update official details
// @route   PUT /api/admin/officials/:id
// @access  Private (Admin only)
exports.updateOfficial = asyncHandler(async (req, res) => {
    try {
        const official = await BarangayOfficial.findById(req.params.id);
        
        if (!official) {
            res.status(404);
            throw new Error('Official not found');
        }

        try {
            // Sanitize incoming name fields to avoid stray characters
            const body = { ...req.body };
            if (body.middleInitial !== undefined) {
                body.middleInitial = String(body.middleInitial || '').trim();
            }
            if (body.lastName) {
                let ln = String(body.lastName).trim();
                if (ln.length > 1 && ln.endsWith('C') && !ln.endsWith(' C')) {
                    ln = ln.slice(0, -1);
                }
                body.lastName = ln;
            }

            const updatedOfficial = await BarangayOfficial.findByIdAndUpdate(
                req.params.id,
                { 
                    ...body, 
                    isDeleted: official.isDeleted, // Preserve isDeleted status
                    status: body.status || official.status // Preserve status if not updated
                },
                { new: true, runValidators: true }
            );

            res.status(200).json({
                success: true,
                data: updatedOfficial,
                message: 'Official updated successfully'
            });
            try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: 'admin', actorId: req.user?.adminID, action: 'edit_user', details: `Admin updated official ${updatedOfficial.officialID || updatedOfficial._id}: ${JSON.stringify(body)}` }); } catch(e) { console.warn('Failed to record official update log', e && e.message); }
        } catch (err) {
            if (err.name === 'ValidationError') {
        console.error('Validation error in updateOfficial:', err);
        return res.status(400).json({ success: false, message: err.message });
            }
            if (err.code === 11000) {
        console.error('Duplicate key error in updateOfficial:', err);
        return res.status(409).json({ success: false, message: 'Duplicate field value violates unique constraint' });
            }
            throw err;
        }
    } catch (error) {
    console.error('Error in updateOfficial (outer):', error);
    res.status(500).json({ success: false, message: 'Error updating official', error: error.message });
    }
});

// @desc    Setup Multi-Factor Authentication for admin
// @route   POST /api/admin/setup-mfa
// @access  Private (Admin only)
const setupMFA = asyncHandler(async (req, res) => {
    try {
        const uid = req.user.uid; // Get Firebase UID from auth middleware

        // Get the user's session cookie
        const sessionCookie = req.cookies.session || '';

        // Verify the session cookie
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);

        if (!decodedClaims) {
            res.status(401);
            throw new Error('Unauthorized - Invalid session');
        }

        // Generate a multi-factor auth enrollment session
        const multiFactorSession = await admin.auth().generateMultiFactorAuthenticationSession(uid, {
            factorId: 'phone'
        });

        res.status(200).json({
            success: true,
            data: {
                multiFactorSession: multiFactorSession,
                phoneNumber: req.body.phoneNumber // Phone number provided in request
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Verify Multi-Factor Authentication for admin
// @route   POST /api/admin/verify-mfa
// @access  Private (Admin only)
const verifyMFA = asyncHandler(async (req, res) => {
    try {
        const { verificationCode, multiFactorSession } = req.body;
        const uid = req.user.uid;

        // Verify the MFA code
        const mfaVerification = await admin.auth().verifyMultiFactorAuth(uid, {
            code: verificationCode,
            session: multiFactorSession
        });

        if (!mfaVerification.success) {
            res.status(400);
            throw new Error('Invalid verification code');
        }

        // Update the admin document to mark MFA as enabled
        await Admin.findOneAndUpdate(
            { firebaseUid: uid },
            { mfaEnabled: true },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'MFA verification successful',
            data: {
                mfaEnabled: true
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// Request password reset (step 1)
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        
        const admin = await Admin.findOne({ adminEmail: email });
        if (!admin) {
            return res.status(200).json({
                success: true,
                message: 'If an account exists, a reset link will be sent to your email'
            });
        }

        // Generate a reset token that expires in 1 hour
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour

        admin.resetToken = resetToken;
        admin.resetTokenExpiry = resetTokenExpiry;
        await admin.save();

        // TODO: Send reset email with token
        // For now, we'll return the token in response (only for development)
        res.status(200).json({
            success: true,
            message: 'Reset instructions sent to email',
            token: resetToken // Remove this in production
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error requesting password reset',
            error: error.message
        });
    }
};

// @desc    Update Barangay Official status
// @route   PUT /api/admin/officials/:id/status
// @access  Admin only
exports.updateOfficialStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        // Find the official
        const official = await BarangayOfficial.findById(id);
        if (!official) {
            res.status(404);
            throw new Error('Official not found');
        }

        // Update the status
        official.status = status;

        // If approving, update Firebase claims
        if (status === 'approved') {
            try {
                // Get existing Firebase user
                let firebaseUser;
                try {
                    firebaseUser = await admin.auth().getUser(official.firebaseUid);
                } catch (error) {
                    if (error.code === 'auth/user-not-found') {
                        // If Firebase user doesn't exist, something went wrong during registration
                        res.status(500);
                        throw new Error('Firebase user not found. Please contact system administrator.');
                    }
                    throw error;
                }

                // Update custom claims - normalize role to 'official'
                await admin.auth().setCustomUserClaims(official.firebaseUid, {
                    role: 'official',
                    position: official.position,
                    officialId: official.officialID,
                    status: 'approved'
                });

                // Generate new custom token with updated claims
                const customToken = await admin.auth().createCustomToken(official.firebaseUid);

                // Save the changes
                await official.save();

                // Return success with token
                return res.status(200).json({
                    success: true,
                    message: 'Official approved and Firebase account created',
                    data: {
                        official: {
                            id: official._id,
                            officialID: official.officialID,
                            officialEmail: official.officialEmail,
                            firstName: official.firstName,
                            lastName: official.lastName,
                            position: official.position,
                            status: official.status
                        },
                        token: customToken
                    }
                });
            } catch (error) {
                console.error('Firebase account creation error:', error);
                res.status(500);
                throw new Error('Error creating Firebase account');
            }
        }

        // Save changes if not approved
        await official.save();

        res.status(200).json({
            success: true,
            message: `Official status updated to ${status}`,
            data: {
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
        res.status(500);
        throw new Error(`Error updating official status: ${error.message}`);
    }
});

// Reset password with token (step 2)
exports.resetAdminPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;
        
        // Check if passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Find admin with valid reset token
        const admin = await Admin.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });

        if (!admin) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Update password and clear reset token
        admin.adminPassword = newPassword;
        admin.resetToken = undefined;
        admin.resetTokenExpiry = undefined;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Password reset successful'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
};

// @desc    Register a new admin
// @route   POST /api/admin/register
// @access  Public
const registerAdmin = asyncHandler(async (req, res) => {
    const {
        email,
        password,
        firstName,
        lastName,
        contactNumber,
        adminRole
    } = req.body;

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email }); 
    if (existingAdmin) {
        res.status(400);
        throw new Error('Admin already exists');
    }

    try {
        // Create admin in MongoDB first (without firebaseUid)
        const newAdmin = await Admin.create({
            firebaseUid: null,
            email,
            firstName,
            lastName,
            contactNumber,
            adminRole
        });

        // Now attempt to create Firebase user and attach UID to the created admin
        let customToken = null;
        try {
            const userRecord = await admin.auth().createUser({
                email: email,
                password: password,
                displayName: `${firstName} ${lastName}`,
                emailVerified: false
            });

            // Create custom claims for the user
            await admin.auth().setCustomUserClaims(userRecord.uid, {
                role: 'admin',
                adminRole: adminRole
            });

            // Save firebaseUid on the admin record
            newAdmin.firebaseUid = userRecord.uid;
            await newAdmin.save();

            // Create custom token for initial sign-in
            customToken = await admin.auth().createCustomToken(userRecord.uid);
        } catch (firebaseErr) {
            // Rollback MongoDB admin if Firebase creation fails
            console.error('Firebase creation failed for admin, rolling back MongoDB record:', firebaseErr);
            try {
                await Admin.findByIdAndDelete(newAdmin._id);
            } catch (delErr) {
                console.error('Failed to delete admin after Firebase error:', delErr);
            }
            res.status(500);
            throw new Error('Error creating Firebase account: ' + firebaseErr.message);
        }

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
            data: {
                token: customToken,
                admin: {
                    id: newAdmin._id,
                    firebaseUid: newAdmin.firebaseUid,
                    email: newAdmin.email,
                    firstName: newAdmin.firstName,
                    lastName: newAdmin.lastName,
                    adminRole: newAdmin.adminRole
                }
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});
// @desc    Register a new admin (creates pending registration)
exports.registerAdmin = async (req, res) => {
    try {
        const { adminID, adminEmail, adminRole, firstName, middleInitial, lastName, adminPassword } = req.body;
        
        console.log(`Attempting to register new admin: ${firstName} ${lastName} (${adminRole})`);

        // Check if role is already taken
        const existingRole = await Admin.findOne({ adminRole });
        if (existingRole) {
            console.log(`Registration failed: Admin role ${adminRole} is already taken`);
            return res.status(400).json({
                success: false,
                message: `An admin with role ${adminRole} already exists`
            });
        }

        console.log('Creating new admin record in MongoDB...');
        // Create new admin in MongoDB first (without firebaseUid)
        const adminUser = new Admin({
            adminID,
            adminEmail,
            adminRole,
            firstName,
            middleInitial,
            lastName,
            adminPassword,
            firebaseUid: null, // Will set after Firebase creation
            status: 'pending' // Set initial status as pending
        });

        await adminUser.save();

        // Now create Firebase user and attach UID
        let customToken = null;
        try {
            console.log('Creating user in Firebase...');
            const userRecord = await admin.auth().createUser({
                email: adminEmail,
                password: adminPassword,
                displayName: `${firstName} ${lastName}`,
                emailVerified: false
            });

            // Set custom claims for admin role
            await admin.auth().setCustomUserClaims(userRecord.uid, {
                role: 'admin',
                adminRole: adminRole
            });

            // Generate custom token
            customToken = await admin.auth().createCustomToken(userRecord.uid);

            // store uid on admin record
            adminUser.firebaseUid = userRecord.uid;
            await adminUser.save();
        } catch (firebaseErr) {
            console.error('Firebase creation failed for admin, rolling back MongoDB record:', firebaseErr);
            try {
                await Admin.findByIdAndDelete(adminUser._id);
            } catch (delErr) {
                console.error('Failed to delete admin after Firebase error:', delErr);
            }
            res.status(500).json({ success: false, message: 'Error creating Firebase account', error: firebaseErr.message });
            return;
        }

        console.log(`Successfully registered admin with ID: ${adminUser._id}, Firebase UID: ${adminUser.firebaseUid}`);

        // Set HttpOnly cookie for secure token storage
        res.cookie('authToken', customToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully. Pending approval.',
            data: {
                token: customToken, // Still included for fallback/compatibility
                admin: {
                    id: adminUser._id,
                    adminID: adminUser.adminID,
                    email: adminUser.adminEmail,
                    role: adminUser.adminRole,
                    status: adminUser.status
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error registering admin',
            error: error.message
        });
    }
};

// Generate JWT Token
const generateToken = async (adminUser) => {
    try {
        // If the admin has a Firebase UID, create a custom token
        if (adminUser.firebaseUid) {
            return await admin.auth().createCustomToken(adminUser.firebaseUid);
        }
        
        // If no Firebase UID, try to get the user by email first
        try {
            const firebaseUser = await admin.auth().getUserByEmail(adminUser.adminEmail);
            // Found existing Firebase user, update admin document with UID
            adminUser.firebaseUid = firebaseUser.uid;
            await adminUser.save();
            return await admin.auth().createCustomToken(firebaseUser.uid);
        } catch (error) {
            // If user doesn't exist in Firebase, create new one
            if (error.code === 'auth/user-not-found') {
                const newFirebaseUser = await admin.auth().createUser({
                    email: adminUser.adminEmail,
                    displayName: `${adminUser.firstName} ${adminUser.lastName}`,
                    emailVerified: false
                });

                // Update the admin document with the new Firebase UID
                adminUser.firebaseUid = newFirebaseUser.uid;
                await adminUser.save();

                // Create custom token
                return await admin.auth().createCustomToken(newFirebaseUser.uid);
            }
            throw error;
        }
    } catch (error) {
        console.error('Error generating token:', error);
        throw new Error(`Error generating authentication token: ${error.message}`);
    }
};

// Admin Login
exports.loginAdmin = async (req, res) => {
    try {
        // Accept either adminPassword or password from the request body
        const { adminEmail, adminPassword, password } = req.body;
        const passwordToUse = adminPassword || password;

        // Log attempt without exposing secrets
        console.log('Login attempt for admin:', { adminEmail, hasAdminPassword: !!adminPassword, hasPassword: !!password });

        // Find admin
        const adminUser = await Admin.findOne({ adminEmail, isDeleted: false });
        console.log('Found admin:', { 
            found: !!adminUser, 
            email: adminEmail,
            storedPasswordLength: adminUser ? adminUser.adminPassword.length : 0 
        });

        if (!adminUser) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is approved
        if (adminUser.status !== 'approved') {
            return res.status(401).json({
                success: false,
                message: 'Your account is pending approval. Please contact the system administrator.'
            });
        }

    // Check password (do not log sensitive data)
    console.log('About to compare password for admin:', adminEmail);
    const isMatch = await adminUser.comparePassword(passwordToUse);
    console.log('Password match result for admin:', adminEmail, isMatch);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate Firebase custom token
        const customToken = await generateToken(adminUser);

        // Set HttpOnly cookie for secure token storage
        res.cookie('authToken', customToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token: customToken, // Still included for fallback/compatibility
                admin: {
                    id: adminUser._id,
                    adminID: adminUser.adminID,
                    email: adminUser.adminEmail,
                    role: adminUser.adminRole,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName
                }
            }
        });

        // Record system log for admin login
        try {
            const forwarded = (req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])) || null;
            const ipToRecord = forwarded ? String(forwarded).split(',')[0].trim() : req.ip;
            await SystemLog.createLog({
                logID: `LOG-${Date.now()}`,
                actorType: 'admin',
                actorId: adminUser._id,
                action: 'login',
                details: `Admin ${adminUser.adminID} logged in`,
                ipAddress: ipToRecord,
                timestamp: new Date()
            });
            console.log('Recorded login system log for admin', adminUser.adminID, 'ip=', ipToRecord);
        } catch (logErr) {
            console.warn('Failed to record login system log:', logErr && logErr.message, logErr);
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// @desc    Get admin profile (current authenticated admin)
// @route   GET /api/admin/profile
// @access  Private (Admin)
exports.getProfile = asyncHandler(async (req, res) => {
    // First try to find by firebaseUid
    let adminUser = null;
    if (req.user && req.user.uid) {
        adminUser = await Admin.findOne({ firebaseUid: req.user.uid });
    }

    // Fallback: try to find by email present in the token (useful if firebaseUid wasn't linked)
    if (!adminUser && req.user && req.user.email) {
        adminUser = await Admin.findOne({ adminEmail: req.user.email });
        // If we find the admin by email but firebaseUid is not set, link it for future requests
        if (adminUser && !adminUser.firebaseUid && req.user.uid) {
            adminUser.firebaseUid = req.user.uid;
            try { await adminUser.save(); } catch (e) { console.warn('Failed to auto-link admin firebaseUid:', e && e.message); }
        }
    }

    if (adminUser) {
        res.status(200).json({
            success: true,
            data: {
                id: adminUser._id,
                firebaseUid: adminUser.firebaseUid,
                adminID: adminUser.adminID,
                adminEmail: adminUser.adminEmail,
                firstName: adminUser.firstName,
                middleInitial: adminUser.middleInitial,
                lastName: adminUser.lastName,
                adminRole: adminUser.adminRole
            }
        });
    } else {
        res.status(404);
        throw new Error('Admin not found');
    }
});

// @desc    Update admin profile (current authenticated admin)
// @route   PUT /api/admin/profile
// @access  Private (Admin)
exports.updateProfile = asyncHandler(async (req, res) => {
    // Try to find by firebaseUid first, else fallback to adminEmail
    let adminUser = null;
    if (req.user && req.user.uid) adminUser = await Admin.findOne({ firebaseUid: req.user.uid });
    if (!adminUser && req.user && req.user.email) adminUser = await Admin.findOne({ adminEmail: req.user.email });

    if (!adminUser) {
        res.status(404);
        throw new Error('Admin not found');
    }

    // Update fields locally
    if (req.body.firstName !== undefined) adminUser.firstName = req.body.firstName;
    if (req.body.middleInitial !== undefined) adminUser.middleInitial = req.body.middleInitial;
    if (req.body.lastName !== undefined) adminUser.lastName = req.body.lastName;

    // If email is being updated, update in Firebase too (if uid available)
    if (req.body.email && req.body.email !== adminUser.adminEmail) {
        try {
            if (req.user && req.user.uid) {
                await admin.auth().updateUser(req.user.uid, { email: req.body.email, emailVerified: false });
            }
            adminUser.adminEmail = req.body.email;
        } catch (err) {
            console.error('Failed to update Firebase email for admin:', err);
            res.status(500);
            throw new Error('Failed to update email');
        }
    }

    // If password is being changed, update Firebase and local hash
    if (req.body.password) {
        try {
            if (req.user && req.user.uid) {
                await admin.auth().updateUser(req.user.uid, { password: req.body.password });
            }
            adminUser.adminPassword = req.body.password;
        } catch (err) {
            console.error('Failed to update Firebase password for admin:', err);
            res.status(500);
            throw new Error('Failed to update password');
        }
    }

    // If firebaseUid is missing but we have uid, link it
    if (!adminUser.firebaseUid && req.user && req.user.uid) {
        adminUser.firebaseUid = req.user.uid;
    }

    const updated = await adminUser.save();

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            id: updated._id,
            firebaseUid: updated.firebaseUid,
            adminID: updated.adminID,
            adminEmail: updated.adminEmail,
            firstName: updated.firstName,
            middleInitial: updated.middleInitial,
            lastName: updated.lastName,
            adminRole: updated.adminRole
        }
    });
    // record admin profile update
    try {
        const { recordLog } = require('../middleware/logger');
        await recordLog({ req, actorType: 'admin', actorId: updated._id, action: 'admin_profile_updated', details: `Admin profile updated for ${updated.adminID || updated._id}` });
    } catch (e) { console.warn('Failed to record admin profile update log', e && e.message); }
});

// Get all admins
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({ isDeleted: false }, '-adminPassword')
            .select('adminID adminEmail adminRole firstName lastName contactNumber createdAt');
        
        res.status(200).json({
            success: true,
            count: admins.length,
            data: admins
        });
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admins',
            error: error.message
        });
    }
};

// Get all victims
exports.getAllVictims = async (req, res) => {
    try {
        const victims = await Victim.find({ isDeleted: false })
            .select('victimID firstName lastName email contactNumber address createdAt status');
        
        res.status(200).json({
            success: true,
            count: victims.length,
            data: victims
        });
    } catch (error) {
        console.error('Error fetching victims:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching victims',
            error: error.message
        });
    }
};

// Get all barangay officials
exports.getAllOfficials = async (req, res) => {
    try {
        const officials = await BarangayOfficial.find({ isDeleted: false })
            .select('officialID firstName lastName email contactNumber position barangay createdAt');
        
        res.status(200).json({
            success: true,
            count: officials.length,
            data: officials
        });
    } catch (error) {
        console.error('Error fetching officials:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching barangay officials',
            error: error.message
        });
    }
};

// Soft delete admin (backend admin only)
exports.softDeleteAdmin = async (req, res) => {
    try {
        // // Backend admin role check - temporarily commented out
        // if (req.admin.adminRole !== 'backend') {
        //     return res.status(403).json({
        //         success: false,
        //         message: 'Access denied. Only backend admin can delete admins'
        //     });
        // }

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (admin.adminRole === 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete backend admin'
            });
        }

        admin.isDeleted = true;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Admin soft deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting admin',
            error: error.message
        });
    }
};

// @desc    Update admin details
// @route   PUT /api/admin/admins/:id
// @access  Admin only (temporarily unprotected in routes)
exports.updateAdmin = asyncHandler(async (req, res) => {
    try {
        const adminUser = await Admin.findById(req.params.id);
        if (!adminUser) {
            res.status(404);
            throw new Error('Admin not found');
        }

        try {
            const updated = await Admin.findByIdAndUpdate(
                req.params.id,
                { ...req.body, isDeleted: adminUser.isDeleted },
                { new: true, runValidators: true }
            );

            res.status(200).json({
                success: true,
                data: updated,
                message: 'Admin updated successfully'
            });
        } catch (err) {
            if (err.name === 'ValidationError') {
                return res.status(400).json({ success: false, message: err.message });
            }
            if (err.code === 11000) {
                return res.status(409).json({ success: false, message: 'Duplicate field value violates unique constraint' });
            }
            throw err;
        }
    } catch (error) {
        res.status(500);
        throw new Error('Error updating admin: ' + error.message);
    }
});

// Hard delete admin (backend admin only)
exports.hardDeleteAdmin = async (req, res) => {
    try {
        if (req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can permanently delete admins'
            });
        }

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (admin.adminRole === 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete backend admin'
            });
        }

        await Admin.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Admin permanently deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting admin',
            error: error.message
        });
    }
};

// Restore soft-deleted admin (backend admin only)
exports.restoreAdmin = async (req, res) => {
    try {
        if (req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can restore admins'
            });
        }

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        admin.isDeleted = false;
        admin.status = req.body.status || "approved"; // Add status update
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Admin restored successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error restoring admin',
            error: error.message
        });
    }
};

// Get all victims (backend admin only)
exports.getAllVictims = async (req, res) => {
    try {
        // Temporarily commented out admin role check
        /*if (req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can view victims'
            });
        }*/

        const victims = await Victim.find({}, '-victimPassword');
        res.status(200).json({
            success: true,
            data: victims
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching victims',
            error: error.message
        });
    }
};

// Soft delete victim (backend admin only)
exports.softDeleteVictim = async (req, res) => {
    try {
        if (req.admin && req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can delete victims'
            });
        }

        const victim = await Victim.findById(req.params.id);
        if (!victim) {
            return res.status(404).json({
                success: false,
                message: 'Victim not found'
            });
        }

        victim.isDeleted = true;
        await victim.save();

        res.status(200).json({
            success: true,
            message: 'Victim soft deleted successfully'
        });
    } catch (error) {
        console.error('Error in hardDeleteVictim:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting victim',
            error: error.message,
            stack: error.stack
        });
    }
};

// Hard delete victim (backend admin only)
exports.hardDeleteVictim = async (req, res) => {
    try {
        if (req.admin && req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can permanently delete victims'
            });
        }

        const victim = await Victim.findByIdAndDelete(req.params.id);
        if (!victim) {
            return res.status(404).json({
                success: false,
                message: 'Victim not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Victim permanently deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting victim',
            error: error.message
        });
    }
};

// Get all barangay officials (backend admin only)
exports.getAllOfficials = async (req, res) => {
    try {
        // Temporarily commented out admin role check
        /*if (req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can view officials'
            });
        }*/

        const officials = await BarangayOfficial.find({}, '-adminPassword');
        res.status(200).json({
            success: true,
            data: officials
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching officials',
            error: error.message
        });
    }
};

// Soft delete barangay official (backend admin only)
exports.softDeleteOfficial = async (req, res) => {
    try {
        if (req.admin && req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can delete officials'
            });
        }

        const official = await BarangayOfficial.findById(req.params.id);
        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        official.isDeleted = true;
        await official.save();

        res.status(200).json({
            success: true,
            message: 'Official soft deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting official',
            error: error.message
        });
    }
};

// Hard delete barangay official (backend admin only)
exports.hardDeleteOfficial = async (req, res) => {
    try {
        if (req.admin && req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can permanently delete officials'
            });
        }

        const official = await BarangayOfficial.findByIdAndDelete(req.params.id);
        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Official permanently deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting official',
            error: error.message
        });
    }
};

// @desc    Setup Multi-Factor Authentication for admin
// @route   POST /api/admin/setup-mfa
// @access  Private (Admin only)
exports.setupMFA = asyncHandler(async (req, res) => {
    try {
        const uid = req.user.uid; // Get Firebase UID from auth middleware

        // Get the user's session cookie
        const sessionCookie = req.cookies.session || '';

        // Verify the session cookie
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);

        if (!decodedClaims) {
            res.status(401);
            throw new Error('Unauthorized - Invalid session');
        }

        // Generate a multi-factor auth enrollment session
        const multiFactorSession = await admin.auth().generateMultiFactorAuthenticationSession(uid, {
            factorId: 'phone'
        });

        res.status(200).json({
            success: true,
            data: {
                multiFactorSession: multiFactorSession,
                phoneNumber: req.body.phoneNumber // Phone number provided in request
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});

// @desc    Verify Multi-Factor Authentication for admin
// @route   POST /api/admin/verify-mfa
// @access  Private (Admin only)
exports.verifyMFA = asyncHandler(async (req, res) => {
    try {
        const { verificationCode, multiFactorSession } = req.body;
        const uid = req.user.uid;

        // Verify the MFA code
        const mfaVerification = await admin.auth().verifyMultiFactorAuth(uid, {
            code: verificationCode,
            session: multiFactorSession
        });

        if (!mfaVerification.success) {
            res.status(400);
            throw new Error('Invalid verification code');
        }

        // Update the admin document to mark MFA as enabled
        await Admin.findOneAndUpdate(
            { firebaseUid: uid },
            { mfaEnabled: true },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'MFA verification successful',
            data: {
                mfaEnabled: true
            }
        });
    } catch (error) {
        res.status(400);
        throw new Error(error.message);
    }
});