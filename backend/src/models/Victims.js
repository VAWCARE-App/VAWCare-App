const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const victimSchema = new mongoose.Schema({
    victimID: {
        type: String,
        required: [true, 'Victim ID is required'],
        unique: true,
        trim: true
    },
    victimAccount: {
        type: String,
        required: [true, 'Account type is required'],
        enum: {
            values: ['Registered User', 'Anonymous'],
            message: 'Account type must be either Registered User or Anonymous'
        }
    },
    victimType: {
        type: String,
        required: [true, 'Victim type is required'],
        enum: {
            values: ['Child', 'Woman'],
            message: 'Victim type must be either Child or Woman'
        }
    },
    victimUsername: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true
    },
    victimEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    firstName: {
        type: String,
        default: 'Anonymous',
        trim: true
    },
    middleInitial: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        default: 'User',
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    location: {
        latitude: {
            type: Number
        },
        longitude: {
            type: Number
        }
    },
    contactNumber: {
        type: String,
        trim: true
    },
    victimPassword: {
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
    emergencyContacts: [{
        name: String,
        relationship: String,
        contactNumber: String,
        address: String
    }],
    isAnonymous: {
        type: Boolean,
        required: [true, 'Anonymous status is required'],
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});

// Pre-save middleware to hash password before saving
victimSchema.pre('save', async function(next) {
    if (!this.isModified('victimPassword')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.victimPassword = await bcrypt.hash(this.victimPassword, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to handle anonymous users
victimSchema.pre('save', function(next) {
    if (this.isAnonymous) {
        this.firstName = 'Anonymous';
        this.lastName = 'User';
        this.victimEmail = undefined;
        this.address = undefined;
        this.contactNumber = undefined;
        this.emergencyContacts = [];
    }
    next();
});

// Method to compare passwords for login
victimSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.victimPassword);
};

const Victim = mongoose.model('Victim', victimSchema);

module.exports = Victim;