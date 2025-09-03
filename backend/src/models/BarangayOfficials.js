const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const barangayOfficialSchema = new mongoose.Schema({
    officialID: {
        type: String,
        required: [true, 'Official ID is required'],
        unique: true,
        trim: true
    },
    officialEmail: {
        type: String,
        required: [true, 'Email address is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
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
    position: {
        type: String,
        required: [true, 'Position is required'],
        trim: true,
        enum: {
            values: ['Barangay Captain', 'Kagawad', 'Secretary', 'Treasurer', 'SK Chairman', 'Chief Tanod'],
            message: 'Please enter a valid position'
        }
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
    contactNumber: {
        type: String,
        required: [true, 'Contact number is required'],
        trim: true,
        match: [/^(\+63|0)[0-9]{10}$/, 'Please enter a valid Philippine phone number']
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    firebaseUid: {
        type: String,
        sparse: true
    }
});

// Middleware to create Firebase account when status changes to approved
barangayOfficialSchema.pre('save', async function(next) {
    const official = this;
    
    // If status is being changed to approved and no Firebase account exists
    if (official.isModified('status') && 
        official.status === 'approved' && 
        !official.firebaseUid) {
        
        try {
            const admin = require('../config/firebase-config');
            
            // Create Firebase user
            const userRecord = await admin.auth().createUser({
                email: official.officialEmail,
                password: official.adminPassword, // Note: This should be the original password, not the hashed one
                displayName: `${official.firstName} ${official.lastName}`,
                emailVerified: false
            });

            // Set custom claims for the user
            await admin.auth().setCustomUserClaims(userRecord.uid, {
                role: 'barangay_official',
                position: official.position,
                officialId: official.officialID
            });

            // Set the firebaseUid
            official.firebaseUid = userRecord.uid;
        } catch (error) {
            console.error('Error creating Firebase account:', error);
            next(error);
            return;
        }
    }
    next();
});

// Store original password before hashing for Firebase account creation
barangayOfficialSchema.pre('save', function(next) {
    if (this.isModified('adminPassword')) {
        this._plainPassword = this.adminPassword;
    }
    next();
});

// Pre-save middleware to hash password before saving
barangayOfficialSchema.pre('save', async function(next) {
    if (!this.isModified('adminPassword')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.adminPassword = await bcrypt.hash(this.adminPassword, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords for login
barangayOfficialSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        console.log('Password comparison details:', {
            hashedPasswordExists: !!this.adminPassword,
            hashedPasswordLength: this.adminPassword?.length,
            candidatePasswordExists: !!candidatePassword,
            candidatePasswordLength: candidatePassword?.length
        });

        if (!candidatePassword || !this.adminPassword) {
            console.error('Missing password for comparison');
            return false;
        }

        const isMatch = await bcrypt.compare(candidatePassword, this.adminPassword);
        console.log('Bcrypt comparison result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Error in password comparison:', error);
        throw new Error('Error comparing passwords');
    }
};

const BarangayOfficial = mongoose.model('BarangayOfficial', barangayOfficialSchema);

module.exports = BarangayOfficial;