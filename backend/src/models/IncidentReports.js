const mongoose = require('mongoose');
const fieldEncryption = require('mongoose-field-encryption').fieldEncryption;

// Validation function to check for gibberish
const validateNoGibberish = (value, fieldName) => {
  if (!value) return true;
  
  const strValue = String(value).trim();
  
  // Check for repeated characters (3+ in a row)
  if (/(.)\1{2}/.test(strValue)) {
    throw new Error(`${fieldName} cannot contain repeated characters`);
  }
  
  return true;
};

// Validation function for perpetrator (optional field)
const validatePerpetrator = function(v) {
  if (!v) return true; 
  const strValue = String(v).trim();
  
  // Check for repeated characters (3+ in a row)
  if (/(.)\1{2}/.test(strValue)) {
    throw new Error('Perpetrator name cannot contain repeated characters');
  }
  
  return true;
};

// Validation function for description (required field)
const validateDescription = function(v) {
  if (!v) {
    throw new Error('Description is required');
  }
  
  const strValue = String(v).trim();
  
  // Check for repeated characters (3+ in a row)
  if (/(.)\1{2}/.test(strValue)) {
    throw new Error('Description cannot contain repeated characters');
  }
  
  return true;;;
};

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
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return false;
                // Allow the predefined types or anything starting with "Others:"
                const validTypes = ['Physical', 'Sexual', 'Psychological', 'Economic', 'Emergency'];
                return validTypes.includes(v) || v.startsWith('Others:');
            },
            message: 'Please enter a valid incident type (Physical, Sexual, Psychological, Economic, Emergency, or Others)'
        }
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        validate: {
            validator: validateDescription,
            message: 'Description must be at least 10 characters, contain letters, and not have repeated characters'
        }
    },
    perpetrator: {
        type: String,
        required: false,
        trim: true,
        validate: {
            validator: validatePerpetrator,
            message: 'Perpetrator name can only contain letters, spaces, hyphens, apostrophes, periods, and cannot have repeated characters'
        }
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return false;
                // Check for repeated characters
                if (/(.)\1{2}/.test(v)) {
                  return false;
                }
                return true;
            },
            message: 'Location cannot contain repeated characters'
        }
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
incidentReportSchema.index({ reportID: 1 });
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
