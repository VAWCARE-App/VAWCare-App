const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    adminID: {
        type: String,
        required: [true, 'Admin ID is required'],
        unique: true,
        trim: true
    },
    adminEmail: {
        type: String,
        required: [true, 'Email address is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    adminRole: {
        type: String,
        required: [true, 'Admin role is required'],
        enum: {
            values: ['backend', 'fullstack', 'frontend1', 'frontend2', 'documentation'],
            message: 'Invalid admin role. Must be one of: backend, fullstack, frontend1, frontend2, documentation'
        },
        trim: true,
        unique: true // Ensures only one admin per role
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    middleInitial: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    adminPassword: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        validate: {
            validator: function(password) {
                // Regex pattern to check for:
                // - At least one uppercase letter (?=.*[A-Z])
                // - At least one lowercase letter (?=.*[a-z])
                // - At least one number (?=.*\d)
                // - At least one special character (?=.*[!@#$%^&*(),.?":{}|<>])
                // - Minimum 8 characters .{8,}
                return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/.test(password);
            },
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    resetToken: String,
    resetTokenExpiry: Date,
});

// Two-factor  for Admin
adminSchema.add({
    twoFactorEnabled: {
        type: Boolean,
        default: false
    }
});

// Method to compare passwords for login
adminSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.adminPassword);
};

// Pre-save middleware to hash password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('adminPassword')) return next();

    try {
        // If the password already looks like a bcrypt hash, skip hashing.
        if (typeof this.adminPassword === 'string' && this.adminPassword.startsWith('$2') && this.adminPassword.length === 60) {
            return next();
        }

        const salt = await bcrypt.genSalt(10);
        this.adminPassword = await bcrypt.hash(this.adminPassword, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords for login
adminSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.adminPassword);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;