const mongoose = require('mongoose');

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
        required: true, // Required for both anonymous and regular
        unique: true,
        trim: true,
        minlength: [4, 'Username must be at least 4 characters long']
    },
    victimEmail: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address'],
        required: function() {
            return this.victimAccount === 'regular';
        },
        unique: true,
        sparse: true
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
        trim: true
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

// Virtual for login identifier - allows login with either username or email for regular users
victimSchema.virtual('loginIdentifier').get(function() {
    if (this.victimAccount === 'regular') {
        return this.victimUsername || this.victimEmail;
    }
    return this.victimUsername; // Anonymous users can only use username
});

// Index for email and account type combination
victimSchema.index({ victimEmail: 1, victimAccount: 1 });

const Victim = mongoose.model('Victim', victimSchema);

module.exports = Victim;