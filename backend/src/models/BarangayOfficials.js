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
    }
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
    return await bcrypt.compare(candidatePassword, this.adminPassword);
};

const BarangayOfficial = mongoose.model('BarangayOfficial', barangayOfficialSchema);

module.exports = BarangayOfficial;