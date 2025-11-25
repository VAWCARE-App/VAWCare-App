const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
    logID: {
        type: String,
        required: [true, 'Log ID is required'],
        unique: true,
        trim: true
    },
    // One of victimID, adminID, or officialID may be set depending on who performed the action
    victimID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Victim',
        required: false
    },
    adminID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: false
    },
    officialID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BarangayOfficial',
        required: false
    },
    action: {
        type: String,
        required: [true, 'Action is required'],
        enum: {
            values: [
                    'login',
                    'logout',
                    'page_view',
                    'emergency_button',
                    'report_submission',
                    'chatbot_interaction',
                    'bpo_issued',
                    'bpo_saved',
                    'bpo_edited',
                    'bpo_deleted',
                    'view_bpo',
                    'alert_created',
                    'alert_resolved',
                    'send_sos',
                    'sos_email_sent',
                    'sos_email_failed',
                    'notification_sent',
                    'notification_failed',
                    'profile_updated',
                    'admin_profile_updated',
                    'official_profile_updated',
                    'victim_profile_updated',
                    'settings_updated',
                    'password_changed',
                    'account_created',
                    'account_deactivated',
                    'create_official',
                    'view_report',
                    'edit_report',
                    'delete_report',
                    'view_case',
                    'edit_case',
                    'delete_case',
                    'edit_user',
                    'view_user',
                    'delete_user',
                    'emergency_contact_added',
                    'emergency_contact_updated',
                    'emergency_contact_removed'
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
        lowercase: true, // Normalize to lowercase for consistent filtering
        // Removed strict IPv4 validation to allow IPv6, proxy headers, or other formats
    }
}, {
    timestamps: true // This will add createdAt and updatedAt timestamps
});

// Keep actor business id (string) for cases where frontend supplies a business identifier
// (e.g. ADM001, VIC001) instead of a DB ObjectId. This allows logs to record the
// visible actor id directly without requiring resolution to a Mongo _id.
systemLogSchema.add({
    actorBusinessId: {
        type: String,
        trim: true,
        required: false
    }
});

// Create indexes for faster querying
systemLogSchema.index({ victimID: 1 });
systemLogSchema.index({ adminID: 1 });
systemLogSchema.index({ officialID: 1 });
systemLogSchema.index({ action: 1 });
systemLogSchema.index({ timestamp: -1 });
systemLogSchema.index({ ipAddress: 1 });

// Static method to get logs by victim
systemLogSchema.statics.getVictimLogs = function(victimID) {
    return this.find({ victimID })
        .sort({ timestamp: -1 })
        .populate('victimID')
        .populate('adminID')
        .populate('officialID');
};

// Static method to get logs by admin
systemLogSchema.statics.getAdminLogs = function(adminID) {
    return this.find({ adminID })
        .sort({ timestamp: -1 })
        .populate('victimID')
        .populate('adminID')
        .populate('officialID');
};

// Static method to get logs by barangay official
systemLogSchema.statics.getOfficialLogs = function(officialID) {
    return this.find({ officialID })
        .sort({ timestamp: -1 })
        .populate('victimID')
        .populate('adminID')
        .populate('officialID');
};

// Helper to create a system log for any actor type
// actorType: one of 'victim'|'admin'|'official'
// actorId: the ObjectId of the corresponding document
systemLogSchema.statics.createLog = async function({ logID, actorType, actorId, actorBusinessId, action, details, ipAddress, timestamp }) {
    const payload = { logID, action, details, ipAddress, timestamp };

    if (actorType === 'victim') payload.victimID = actorId;
    else if (actorType === 'admin') payload.adminID = actorId;
    else if (actorType === 'official') payload.officialID = actorId;

    if (actorBusinessId) payload.actorBusinessId = actorBusinessId;

    const doc = new this(payload);
    return await doc.save();
};

// Static method to get logs by action type
systemLogSchema.statics.getLogsByAction = function(action) {
    return this.find({ action })
        .sort({ timestamp: -1 })
    .populate('victimID')
    .populate('adminID')
    .populate('officialID');
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
    .populate('victimID')
    .populate('adminID')
    .populate('officialID');
};

// Static method to get logs from a specific IP address
systemLogSchema.statics.getLogsByIP = function(ipAddress) {
    return this.find({ ipAddress })
        .sort({ timestamp: -1 })
    .populate('victimID')
    .populate('adminID')
    .populate('officialID');
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