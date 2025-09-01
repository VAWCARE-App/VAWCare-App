const admin = require('../config/firebase-config');
const Admin = require('../models/Admin');
const Victim = require('../models/Victims');
const BarangayOfficial = require('../models/BarangayOfficials');
const asyncHandler = require('express-async-handler');

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

        // Create new admin
        const admin = new Admin({
            adminID,
            adminEmail,
            adminRole,
            firstName,
            middleInitial,
            lastName,
            adminPassword
        });

        await admin.save();

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

// Admin Login
exports.loginAdmin = async (req, res) => {
    try {
        const { adminEmail, adminPassword } = req.body;

        // Find admin
        const admin = await Admin.findOne({ adminEmail, isDeleted: false });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check password
        const isMatch = await admin.comparePassword(adminPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate token
        const token = generateToken(admin);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                admin: {
                    id: admin._id,
                    adminID: admin.adminID,
                    email: admin.adminEmail,
                    role: admin.adminRole
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error logging in',
            error: error.message
        });
    }
};

// Get all admins (backend admin only)
exports.getAllAdmins = async (req, res) => {
    try {
        if (req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can view all admins'
            });
        }

        const admins = await Admin.find({}, '-adminPassword');
        res.status(200).json({
            success: true,
            data: admins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching admins',
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
        if (req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can view victims'
            });
        }

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
        if (req.admin.adminRole !== 'backend') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only backend admin can view officials'
            });
        }

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