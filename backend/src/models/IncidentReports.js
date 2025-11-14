const mongoose = require('mongoose');

const incidentReportSchema = new mongoose.Schema({
    reportID: {
        type: String,
        required: [true, 'Report ID is required'],
        unique: true,
        trim: true
    },
    victimID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Victim',
        required: [true, 'Victim ID is required']
    },
    incidentType: {
        type: String,
        required: [true, 'Incident type is required'],
        enum: {
            values: ['Physical', 'Sexual', 'Psychological', 'Economic', 'Emergency'],
            message: 'Please enter a valid incident type'
        },
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true
    },
    perpetrator: {
        type: String,
        required: false,
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    dateReported: {
        type: Date,
        required: [true, 'Date reported is required'],
        default: Date.now
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: {
            values: ['Pending', 'Open', 'Under Investigation', 'Closed'],
            message: 'Please enter a valid status'
        },
        default: 'Pending',
        trim: true
    },

}, {
    timestamps: true // This will add createdAt and updatedAt timestamps
});

// Explicit createdAt field (kept for clarity; timestamps:true will also manage this value)
incidentReportSchema.add({
    createdAt: { type: Date, default: Date.now }
});

// Soft-delete fields
incidentReportSchema.add({
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});

// Add query middleware to hide soft-deleted documents by default
function addNotDeletedConstraint() {
    // 'this' is a Query
    const q = this.getQuery();
    // If caller explicitly queries for deleted (e.g., { deleted: true }) leave it alone
    if (q && Object.prototype.hasOwnProperty.call(q, 'deleted')) return;
    this.where({ deleted: { $ne: true } });
}

incidentReportSchema.pre(/^find/, addNotDeletedConstraint);
incidentReportSchema.pre('countDocuments', addNotDeletedConstraint);
incidentReportSchema.pre('findOneAndUpdate', function(next) {
    // ensure findOneAndUpdate also doesn't accidentally act on deleted docs when caller didn't intend to
    const q = this.getQuery();
    if (!Object.prototype.hasOwnProperty.call(q, 'deleted')) this.where({ deleted: { $ne: true } });
    next();
});

// Create indexes for faster querying
// reportID already has `unique: true` on the field definition; avoid duplicate index declaration
incidentReportSchema.index({ victimID: 1 });
incidentReportSchema.index({ status: 1 });
incidentReportSchema.index({ dateReported: -1 });

// Method to get reports by status
incidentReportSchema.statics.getReportsByStatus = function(status) {
    return this.find({ status }).populate('victimID');
};

// Virtual for getting time elapsed since report
incidentReportSchema.virtual('timeElapsed').get(function() {
    return Date.now() - this.dateReported;
});

const IncidentReport = mongoose.model('IncidentReport', incidentReportSchema);

module.exports = IncidentReport;