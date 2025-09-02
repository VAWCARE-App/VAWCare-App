const admin = require('../config/firebase-config');
const Admin = require('../models/Admin');
const Victim = require('../models/Victims');
const BarangayOfficial = require('../models/BarangayOfficials');
const asyncHandler = require('express-async-handler');

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
        // Create user in Firebase
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

        // Create admin in MongoDB
        const newAdmin = await Admin.create({
            firebaseUid: userRecord.uid,
            email,
            firstName,
            lastName,
            contactNumber,
            adminRole
        });

        // Create custom token for initial sign-in
        const customToken = await admin.auth().createCustomToken(userRecord.uid);

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

        // Check if role is already taken
        const existingRole = await Admin.findOne({ adminRole });
        if (existingRole) {
            return res.status(400).json({
                success: false,
                message: `An admin with role ${adminRole} already exists`
            });
        }

        // Create user in Firebase first
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

        // Create new admin in MongoDB
        const adminUser = new Admin({
            adminID,
            adminEmail,
            adminRole,
            firstName,
            middleInitial,
            lastName,
            adminPassword,
            firebaseUid: userRecord.uid // Store Firebase UID
        });

        await adminUser.save();

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
            data: {
                adminID: admin.adminID,
                email: admin.adminEmail,
                role: admin.adminRole
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
        const { adminEmail, adminPassword } = req.body;

        // Find admin
        const adminUser = await Admin.findOne({ adminEmail, isDeleted: false });
        if (!adminUser) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isMatch = await adminUser.comparePassword(adminPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate Firebase custom token
        const customToken = await generateToken(adminUser);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token: customToken,
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
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

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
        if (req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can delete admins'
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
        if (req.admin.adminRole !== 'backend') {
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
        res.status(500).json({
            success: false,
            message: 'Error deleting victim',
            error: error.message
        });
    }
};

// Hard delete victim (backend admin only)
exports.hardDeleteVictim = async (req, res) => {
    try {
        if (req.admin.adminRole !== 'backend') {
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
        if (req.admin.adminRole !== 'backend') {
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
        if (req.admin.adminRole !== 'backend') {
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