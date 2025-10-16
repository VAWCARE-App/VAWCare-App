const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
    alertID: {
        type: String,
        required: [true, 'Alert ID is required'],
        unique: true,
        trim: true
    },
    victimID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Victim',
        required: true
    },
    type: {
        type: String,
        required: [true, 'Alert type is required'],
        enum: {
            values: ['Emergency'],
        },
        trim: true
    },
    location: {
        latitude: {
            type: Number,
            required: [true, 'Latitude is required']
        },
        longitude: {
            type: Number,
            required: [true, 'Longitude is required']
        }
    ,
        // optional accuracy in meters reported by device and sample timestamp
        accuracy: {
            type: Number,
            required: false
        },
        timestamp: {
            type: Number,
            required: false
        }
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: {
            values: ['Active', 'Cancelled', 'Resolved'],
            message: 'Status must be either Active, Cancelled, or Resolved'
        },
        default: 'Active',
        trim: true
    },
    resolvedAt: {
        type: Date,
        required: false
    },
    durationMs: {
        type: Number,
        required: false
    },
    durationStr: {
        type: String,
        required: false,
        trim: true
    },
    notifiedContacts: [{
        contactID: {
            type: String,
            required: false
        },
        name: String,
        contactNumber: String,
        notificationTime: {
            type: Date,
            default: Date.now
        },
        notificationStatus: {
            type: String,
            enum: ['Sent', 'Delivered', 'Failed'],
            default: 'Sent'
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true // This will add createdAt and updatedAt timestamps
});

// Create indexes for faster querying
// Note: 'alertID' has `unique: true` in the field definition above; avoid duplicating the index.
alertSchema.index({ victimID: 1 });
alertSchema.index({ status: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Method to resolve alert
alertSchema.methods.resolveAlert = async function() {
    this.status = 'Resolved';
    return await this.save();
};

// Method to add notified contact
alertSchema.methods.addNotifiedContact = async function(contactInfo) {
    this.notifiedContacts.push(contactInfo);
    return await this.save();
};

// Static method to get active alerts
alertSchema.statics.getActiveAlerts = function() {
    return this.find({ status: 'Active' })
        .populate('victimID')
        .sort({ createdAt: -1 });
};

// Static method to find nearby alerts
alertSchema.statics.findNearbyAlerts = function(latitude, longitude, maxDistance) {
    return this.find({
        status: 'Active',
        'location.latitude': {
            $gte: latitude - maxDistance,
            $lte: latitude + maxDistance
        },
        'location.longitude': {
            $gte: longitude - maxDistance,
            $lte: longitude + maxDistance
        }
    }).populate('victimID');
};

// Virtual for getting alert age
alertSchema.virtual('alertAge').get(function() {
    return Date.now() - this.createdAt;
});

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;