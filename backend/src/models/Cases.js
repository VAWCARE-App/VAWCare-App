const mongoose = require('mongoose');

const CasesSchema = new mongoose.Schema({
	caseID: {
		type: String,
		required: [true, 'Case ID is required'],
		unique: true,
		trim: true,
	},
	reportID: {
		type: String,
		// reportID is optional to allow manual/walk-in case creation
		required: false,
		index: true,
		trim: false,
	},
	victimID: {
		type: String,
		required: false,
		index: true,
		trim: true,
	},
	victimName: {
		type: String,
		required: [true, 'Victim name is required'],
		trim: true,
		validate: {
			validator: function(v) {
				return !v || /^[a-zA-Z\s\-'\.]+$/.test(v);
			},
			message: 'Victim name must contain only letters, spaces, hyphens, apostrophes, or periods'
		}
	},
	victimType: {
		type: String,
		enum: ['child', 'woman', 'anonymous'],
		// Make optional and default to 'anonymous' so case creation doesn't fail when frontend omits this
		required: false,
		default: 'anonymous',
		trim: true,
	},
	victimBirthdate: {
		type: Date,
		required: false,
	},
	victimAge: {
		type: Number,
		required: false,
		min: 0,
		max: 150,
	},
	victimGender: {
		type: String,
		enum: ['male', 'female'],
		required: false,
		trim: true,
	},
	incidentType: {
		type: String,
		required: [true, 'Incident type is required'],
		trim: true,
	},
	incidentSubtype: {
		type: String,
		required: false,
		default: 'Uncategorized',
		trim: true,
	},
	description: {
		type: String,
		required: [true, 'Description is required'],
		trim: true,
	},
	perpetrator: {
		type: String,
		trim: true,
		validate: {
			validator: function(v) {
				return !v || /^[a-zA-Z\s\-'\.]+$/.test(v);
			},
			message: 'Perpetrator name must contain only letters, spaces, hyphens, apostrophes, or periods'
		}
	},
	location: {
		type: String,
		trim: true,
	},
	dateReported: {
		type: Date,
	},
	status: {
		type: String,
		enum: {
			values: ['Open', 'Under Investigation', 'Cancelled', 'Resolved'],
			message: 'Status `{VALUE}` is not valid',
		},
		default: 'Open',
		trim: true,
	},
	assignedOfficer: {
		type: String,
		trim: true,
		validate: {
			validator: function(v) {
				return !v || /^[a-zA-Z\s\-'\.]+$/.test(v);
			},
			message: 'Assigned officer name must contain only letters, spaces, hyphens, apostrophes, or periods'
		}
	},
	riskLevel: {
		type: String,
		enum: {
			values: ['Low', 'Medium', 'High'],
			message: 'Risk level `{VALUE}` is not valid',
		},
		default: 'Low',
		trim: true,
	},
	deletedAt: {
		type: Date,
	},
	deleted: {
		type: Boolean,
		default: false,
	},
	createdAt: {
			type: Date,
			default: Date.now,
		},
	}, {
		timestamps: true
	});

	// Explicit createdAt field (timestamps:true will also manage this value)
	CasesSchema.add({
		createdAt: { type: Date, default: Date.now }
	});

// DSS suggestion / metadata fields persisted for each case
CasesSchema.add({
	dssPredictedRisk: { type: String, required: false, trim: true },
	dssStoredRisk: { type: String, required: false, trim: true },
	dssImmediateAssistanceProbability: { type: Number, required: false, default: 0 },
	dssSuggestion: { type: String, required: false, trim: true },
	dssRuleMatched: { type: Boolean, required: false, default: false },
	dssChosenRule: { type: mongoose.Schema.Types.Mixed, required: false },
	dssManualOverride: { type: Boolean, required: false, default: false }
});

// Soft-delete pre-hooks to exclude deleted records from queries
function addNotDeletedConstraint() {
	const q = this.getQuery();
	if (q && Object.prototype.hasOwnProperty.call(q, 'deleted')) return;
	this.where({ deleted: { $ne: true } });
}

CasesSchema.pre(/^find/, addNotDeletedConstraint);
CasesSchema.pre('countDocuments', addNotDeletedConstraint);
CasesSchema.pre('findOneAndUpdate', function(next) {
	const q = this.getQuery();
	if (!Object.prototype.hasOwnProperty.call(q, 'deleted')) this.where({ deleted: { $ne: true } });
	next();
});

module.exports = mongoose.model('Cases', CasesSchema);
