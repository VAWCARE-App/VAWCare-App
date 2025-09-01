const mongoose = require('mongoose');

const victimSchema = new mongoose.Schema({
    firebaseUid: {
        type: String,
        required: true,
        unique: true
    },
    accountType: {
        type: String,
        required: true,
        enum: ['Registered', 'Anonymous'],
        default: 'Registered'
    },
    victimType: {
        type: String,
        required: true,
        enum: ['Child', 'Woman']
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    middleInitial: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
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
        required: true,
        trim: true
    },
    emergencyContacts: [{
        name: {
            type: String,
            required: true
        },
        relationship: {
            type: String,
            required: true
        },
        contactNumber: {
            type: String,
            required: true
        },
        address: {
            type: String,
            required: true
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
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save middleware to update timestamps
victimSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Pre-save middleware to handle anonymous users
victimSchema.pre('save', function(next) {
    if (this.isAnonymous) {
        this.accountType = 'Anonymous';
        this.firstName = 'Anonymous';
        this.lastName = 'User';
        this.email = `${this.firebaseUid}@anonymous.vawcare.com`;
        this.address = 'Anonymous';
        this.contactNumber = 'Anonymous';
        this.emergencyContacts = [];
    }
    next();
});

const Victim = mongoose.model('Victim', victimSchema);

module.exports = Victim;