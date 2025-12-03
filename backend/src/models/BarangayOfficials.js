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
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[a-zA-Z\s\-'\.]+$/.test(v);
            },
            message: 'First name must contain only letters, spaces, hyphens, apostrophes, or periods'
        }
    },
    middleInitial: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[a-zA-Z\.]+$/.test(v);
            },
            message: 'Middle initial must contain only letters or periods'
        }
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[a-zA-Z\s\-'\.]+$/.test(v);
            },
            message: 'Last name must contain only letters, spaces, hyphens, apostrophes, or periods'
        }
    },
    position: {
        type: String,
        required: [true, 'Position is required'],
        trim: true,
    },
    city: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[a-zA-Z\s\-'\.]+$/.test(v);
            },
            message: 'City/Municipality must contain only letters, spaces, hyphens, apostrophes, or periods'
        }
    },
    province: {
        type: String,
        trim: true,
        validate: {
            validator: function(v) {
                return !v || /^[a-zA-Z\s\-'\.]+$/.test(v);
            },
            message: 'Province must contain only letters, spaces, hyphens, apostrophes, or periods'
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
    officialPassword: {
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
    },
});

// Two-factor for officials
barangayOfficialSchema.add({
    twoFactorEnabled: {
        type: Boolean,
        default: false
    }
});

// Pre-save middleware to hash password before saving
barangayOfficialSchema.pre('save', async function(next) {
    // Auto-uppercase middleInitial if provided
    if (this.middleInitial) {
        this.middleInitial = this.middleInitial.toUpperCase();
    }

    if (!this.isModified('officialPassword')) return next();

    try {
        // If the password already looks like a bcrypt hash, skip hashing to prevent double-hash
        if (typeof this.officialPassword === 'string' && this.officialPassword.startsWith('$2') && this.officialPassword.length === 60) {
            console.log('Skipping hashing for officialPassword: looks already bcrypt-hashed');
            return next();
        }

        const salt = await bcrypt.genSalt(10);
        this.officialPassword = await bcrypt.hash(this.officialPassword, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords for login
barangayOfficialSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        console.log('Password comparison details:', {
            hashedPasswordExists: !!this.officialPassword,
            hashedPasswordLength: this.officialPassword?.length,
            candidatePasswordExists: !!candidatePassword,
            candidatePasswordLength: candidatePassword?.length
        });

        if (!candidatePassword || !this.officialPassword) {
            console.error('Missing password for comparison');
            return false;
        }

        const isMatch = await bcrypt.compare(candidatePassword, this.officialPassword);
        console.log('Bcrypt comparison result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Error in password comparison:', error);
        throw new Error('Error comparing passwords');
    }
};

const BarangayOfficial = mongoose.model('BarangayOfficial', barangayOfficialSchema);

module.exports = BarangayOfficial;