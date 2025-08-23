const mongoose = require('mongoose');

const bpoSchema = new mongoose.Schema({
    bpoID: {
        type: String,
        required: [true, 'BPO ID is required'],
        unique: true,
        trim: true
    },
    reportID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'IncidentReport',
        required: [true, 'Report ID is required']
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BarangayOfficial',
        required: [true, 'Issuing official is required']
    },
    issueDate: {
        type: Date,
        required: [true, 'Issue date is required'],
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required'],
        validate: {
            validator: function(value) {
                // Ensure expiry date is after issue date
                return value > this.issueDate;
            },
            message: 'Expiry date must be after issue date'
        }
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: {
            values: ['Active', 'Expired', 'Revoked'],
            message: 'Status must be either Active, Expired, or Revoked'
        },
        default: 'Active',
        trim: true
    }
}, {
    timestamps: true // This will add createdAt and updatedAt timestamps
});

// Create indexes for faster querying
bpoSchema.index({ bpoID: 1 }, { unique: true });
bpoSchema.index({ reportID: 1 });
bpoSchema.index({ status: 1 });
bpoSchema.index({ expiryDate: 1 });

// Method to check if BPO is expired
bpoSchema.methods.isExpired = function() {
    return Date.now() >= this.expiryDate;
};

// Pre-save middleware to automatically update status if expired
bpoSchema.pre('save', function(next) {
    if (this.expiryDate <= new Date() && this.status === 'Active') {
        this.status = 'Expired';
    }
    next();
});

// Static method to get active BPOs
bpoSchema.statics.getActiveBPOs = function() {
    return this.find({ status: 'Active' })
        .populate('reportID')
        .populate('issuedBy');
};

// Static method to get BPOs by status
bpoSchema.statics.getBPOsByStatus = function(status) {
    return this.find({ status })
        .populate('reportID')
        .populate('issuedBy');
};

// Virtual for getting time until expiry
bpoSchema.virtual('timeUntilExpiry').get(function() {
    return this.expiryDate - Date.now();
});

const BPO = mongoose.model('BPO', bpoSchema);

module.exports = BPO;