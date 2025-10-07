const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

const victimSchema = new mongoose.Schema({
    victimID: {
        type: String,
        unique: true
    },
    victimAccount: {
        type: String,
        required: true,
        enum: ['regular', 'anonymous'],
        default: 'anonymous'
    },
    victimType: {
        type: String,
        required: function () {
            return this.victimAccount === 'regular';
        },
        enum: ['Child', 'Woman']
    },
    isDeleted: {
        type: Boolean,
        default: false
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
        unique: true,
        lowercase: true,
        validate: {
            validator: function (v) {
                if (this.victimAccount === 'anonymous') {
                    return true;
                }
                if (!v) return false;
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: 'Please enter a valid email address'
        },
        required: function () {
            return this.victimAccount === 'regular';
        },
        sparse: true
    },
    firstName: {
        type: String,
        required: function () {
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
        required: function () {
            return this.victimAccount === 'regular';
        },
        default: 'User',
        trim: true
    },
    address: {
        type: String,
        required: function () {
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
        required: function () {
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
    // ticket removed: anonymous access is handled by creating an authenticated session on registration
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
        sparse: true
    },
    otp: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },
}, {
    // keep timestamps in a separate options object if needed later
});

// Two-factor for Victims
victimSchema.add({
    twoFactorEnabled: {
        type: Boolean,
        default: false
    }
});

// Pre-validate middleware
victimSchema.pre('validate', function (next) {
    if (this.victimAccount === 'anonymous') {
        this.victimType = undefined;
        this.victimEmail = undefined;
        this.firstName = 'Anonymous';
        this.lastName = 'User';
        this.address = '';
        this.contactNumber = '';
        this.emergencyContacts = [];
        this.isAnonymous = true;
    }
    next();
});

// SINGLE pre-save middleware (MAIN FIX - removed duplicate that caused double hashing)
victimSchema.pre('save', async function (next) {
    try {
        // Generate victimID if not set
        if (!this.victimID) {
            // Use a separate counter for anonymous accounts so we don't collide with existing VIC IDs
            const counterKey = this.victimAccount === 'anonymous' ? 'anonymousId' : 'victimId';
            const counter = await Counter.findByIdAndUpdate(
                counterKey,
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            if (this.victimAccount === 'anonymous') {
                this.victimID = `ANONYMOUS${counter.seq.toString().padStart(3, '0')}`;
            } else {
                this.victimID = `VIC${counter.seq.toString().padStart(3, '0')}`;
            }
        }

        // Hash password ONLY if modified (ONLY ONCE)
        if (this.isModified('victimPassword')) {
            // If the password already looks like a bcrypt hash, skip hashing.
            if (typeof this.victimPassword === 'string' && this.victimPassword.startsWith('$2') && this.victimPassword.length === 60) {
                return next();
            }

            const salt = await bcrypt.genSalt(10);
            this.victimPassword = await bcrypt.hash(this.victimPassword, salt);
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords for login
victimSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.victimPassword);
    } catch (error) {
        throw new Error('Error comparing passwords');
    }
};

// Indexes
victimSchema.index(
    { victimEmail: 1, victimAccount: 1 },
    {
        unique: true,
        sparse: true,
        partialFilterExpression: { victimAccount: 'regular' }
    }
);

const Victim = mongoose.model('Victim', victimSchema);

module.exports = Victim;