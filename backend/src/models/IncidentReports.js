const mongoose = require('mongoose');
const fieldEncryption = require('mongoose-field-encryption').fieldEncryption;

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
    timestamps: true // createdAt and updatedAt
});

// Explicit createdAt (optional, timestamps:true already handles this)
incidentReportSchema.add({ createdAt: { type: Date, default: Date.now } });

// Soft-delete
incidentReportSchema.add({
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});

// Default "not deleted" query
function addNotDeletedConstraint() {
    const q = this.getQuery();
    if (q && Object.prototype.hasOwnProperty.call(q, 'deleted')) return;
    this.where({ deleted: { $ne: true } });
}

incidentReportSchema.pre(/^find/, addNotDeletedConstraint);
incidentReportSchema.pre('countDocuments', addNotDeletedConstraint);
incidentReportSchema.pre('findOneAndUpdate', function(next) {
    const q = this.getQuery();
    if (!Object.prototype.hasOwnProperty.call(q, 'deleted')) this.where({ deleted: { $ne: true } });
    next();
});

// Indexes
incidentReportSchema.index({ victimID: 1 });
incidentReportSchema.index({ status: 1 });
incidentReportSchema.index({ dateReported: -1 });

// Statics
incidentReportSchema.statics.getReportsByStatus = function(status) {
    return this.find({ status }).populate('victimID');
};

// Virtuals
incidentReportSchema.virtual('timeElapsed').get(function() {
    return Date.now() - this.dateReported;
});

// 🔒 Field-level encryption plugin
incidentReportSchema.plugin(fieldEncryption, {
    fields: ['description', 'perpetrator', 'location'],
    secret: process.env.ENCRYPTION_SECRET,
    saltGenerator: function(secret) {
        return secret.slice(0, 16); // per-document salt
    }
});

const IncidentReport = mongoose.model('IncidentReport', incidentReportSchema);
module.exports = IncidentReport;
