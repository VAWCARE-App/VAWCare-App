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
		required: [true, 'Report ID is required'],
		index: true,
		trim: true,
	},
	victimID: {
		type: String,
		required: [true, 'Victim ID is required'],
		index: true,
		trim: true,
	},
	victimName: {
		type: String,
		required: [true, 'Victim name is required'],
		trim: true,
	},
	incidentType: {
		type: String,
		required: [true, 'Incident type is required'],
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
			values: ['Open', 'Under Investigation', 'Resolved', 'Closed'],
			message: 'Status `{VALUE}` is not valid',
		},
		default: 'Open',
		trim: true,
	},
	assignedOfficer: {
		type: String,
		trim: true,
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

module.exports = mongoose.model('Cases', CasesSchema);
