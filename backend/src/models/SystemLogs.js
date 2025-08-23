const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
    logID: {
        type: String,
        required: [true, 'Log ID is required'],
        unique: true,
        trim: true
    },
    victimID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Victim',
        required: [true, 'Victim ID is required']
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: {
            values: [
                'login',
                'logout',
                'report_submission',
                'bpo_issued',
                'alert_created',
                'alert_resolved',
                'profile_updated',
                'password_changed',
                'account_created',
                'account_deactivated'
            ],
            message: 'Please enter a valid action type'
        },
        trim: true
    },
    details: {
        type: String,
        trim: true
    },
    timestamp: {
        type: Date,
        required: [true, 'Timestamp is required'],
        default: Date.now
    },
    ipAddress: {
        type: String,
        required: [true, 'IP address is required'],
        trim: true,
        match: [
            /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            'Please enter a valid IPv4 address'
        ]
    }
}, {
    timestamps: true // This will add createdAt and updatedAt timestamps
});

// Create indexes for faster querying
systemLogSchema.index({ logID: 1 }, { unique: true });
systemLogSchema.index({ victimID: 1 });
systemLogSchema.index({ action: 1 });
systemLogSchema.index({ timestamp: -1 });
systemLogSchema.index({ ipAddress: 1 });

// Static method to get logs by victim
systemLogSchema.statics.getVictimLogs = function(victimID) {
    return this.find({ victimID })
        .sort({ timestamp: -1 })
        .populate('victimID');
};

// Static method to get logs by action type
systemLogSchema.statics.getLogsByAction = function(action) {
    return this.find({ action })
        .sort({ timestamp: -1 })
        .populate('victimID');
};

// Static method to get logs within a date range
systemLogSchema.statics.getLogsByDateRange = function(startDate, endDate) {
    return this.find({
        timestamp: {
            $gte: startDate,
            $lte: endDate
        }
    })
    .sort({ timestamp: -1 })
    .populate('victimID');
};

// Static method to get logs from a specific IP address
systemLogSchema.statics.getLogsByIP = function(ipAddress) {
    return this.find({ ipAddress })
        .sort({ timestamp: -1 })
        .populate('victimID');
};

// Method to add details to a log
systemLogSchema.methods.addDetails = async function(details) {
    this.details = details;
    return await this.save();
};

// Virtual for time elapsed since log creation
systemLogSchema.virtual('timeElapsed').get(function() {
    return Date.now() - this.timestamp;
});

const SystemLog = mongoose.model('SystemLog', systemLogSchema);

module.exports = SystemLog;