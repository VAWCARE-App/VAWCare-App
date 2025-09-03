const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const victimSchema = new mongoose.Schema({
    victimID: {
        type: String,
        required: function() {
            return this.victimAccount === 'regular';
        },
        unique: true,
        sparse: true
    },
    victimAccount: {
        type: String,
        required: true,
        enum: ['regular', 'anonymous'],
        default: 'anonymous'
    },
    victimType: {
        type: String,
        required: function() {
            return this.victimAccount === 'regular';
        },
        enum: ['Child', 'Woman']
    },
    victimUsername: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: [4, 'Username must be at least 4 characters long']
    },
    victimEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
        unique: true,
        sparse: true  // Optional for all users
    },
    firstName: {
        type: String,
        required: function() {
            return this.victimAccount === 'regular';
        },
        default: 'Anonymous',
        trim: true
    },
    middleInitial: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        required: function() {
            return this.victimAccount === 'regular';
        },
        default: 'User',
        trim: true
    },
    address: {
        type: String,
        required: function() {
            return this.victimAccount === 'regular';
        },
        trim: true
    },
    location: {
        lat: {
            type: Number
        },
        lng: {
            type: Number
        }
    },
    contactNumber: {
        type: String,
        required: function() {
            return this.victimAccount === 'regular';
        },
        trim: true,
        match: [/^(\+63|0)[0-9]{10}$/, 'Please enter a valid Philippine phone number (e.g., +639123456789 or 09123456789)']
    },
    victimPassword: {
        type: String,
        required: true,
        minlength: [8, 'Password must be at least 8 characters long']
    },
    emergencyContacts: [{
        name: {
            type: String,
            trim: true
        },
        relationship: {
            type: String,
            trim: true
        },
        contactNumber: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        }
    }],
    isAnonymous: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    firebaseUid: {
        type: String,
        sparse: true  // Allow null for victims who don't use Firebase
    }
});

// Pre-validate middleware to check required fields based on account type
victimSchema.pre('validate', function(next) {
    if (this.victimAccount === 'anonymous') {
        // For anonymous accounts, only username and password are required
        // All other fields should be cleared
        this.victimID = undefined;
        this.victimType = undefined;
        this.victimEmail = null;
        this.firstName = 'Anonymous';
        this.lastName = 'User';
        this.address = '';
        this.contactNumber = '';
        this.emergencyContacts = [];
        this.isAnonymous = true;
    }
    next();
});

// Virtual for login identifier - allows login with username for all users and email for those who provided it
victimSchema.virtual('loginIdentifier').get(function() {
    // Both regular and anonymous users can use username
    // If email exists (for any user type), it can also be used
    return this.victimEmail ? [this.victimUsername, this.victimEmail] : this.victimUsername;
});

// Index for email and account type combination
victimSchema.index({ victimEmail: 1, victimAccount: 1 });

// Pre-save middleware to hash password before saving
victimSchema.pre('save', async function(next) {
    if (!this.isModified('victimPassword')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.victimPassword = await bcrypt.hash(this.victimPassword, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords for login
victimSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.victimPassword);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};

const Victim = mongoose.model('Victim', victimSchema);

module.exports = Victim;