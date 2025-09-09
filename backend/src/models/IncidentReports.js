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
            values: ['Physical', 'Sexual', 'Psychological'],
            message: 'Please enter a valid incident type'
        },
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
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
            values: ['Pending', 'Under Investigation', 'Resolved'],
            message: 'Please enter a valid status'
        },
        default: 'Pending',
        trim: true
    },
    assignedOfficer: {
        type: String,
        required: false,
        trim: true,
    },
    riskLevel: {
        type: String,
        required: [true, 'Risk level is required'],
        enum: {
            values: ['Low', 'Medium', 'High'],
            message: 'Risk level must be either Low, Medium, or High'
        },
        trim: true
    }
}, {
    timestamps: true // This will add createdAt and updatedAt timestamps
});

// Create indexes for faster querying
incidentReportSchema.index({ reportID: 1 }, { unique: true });
incidentReportSchema.index({ victimID: 1 });
incidentReportSchema.index({ status: 1 });
incidentReportSchema.index({ riskLevel: 1 });
incidentReportSchema.index({ dateReported: -1 });

// Method to get reports by status
incidentReportSchema.statics.getReportsByStatus = function(status) {
    return this.find({ status }).populate('victimID assignedOfficer');
};

// Method to get reports by risk level
incidentReportSchema.statics.getReportsByRiskLevel = function(riskLevel) {
    return this.find({ riskLevel }).populate('victimID assignedOfficer');
};

// Virtual for getting time elapsed since report
incidentReportSchema.virtual('timeElapsed').get(function() {
    return Date.now() - this.dateReported;
});

const IncidentReport = mongoose.model('IncidentReport', incidentReportSchema);

module.exports = IncidentReport;