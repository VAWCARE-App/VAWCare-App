const mongoose = require('mongoose');

// Schema matching frontend field names exactly as requested
const bpoSchema = new mongoose.Schema({
	bpoID: {
		type: String,
		required: [true, 'BPO ID is required'],
		unique: true,
		trim: true
	},

	controlNO: { type: String, trim: true },
	nameofRespondent: { type: String, trim: true },
	address: { type: String, trim: true },
	applicationName: { type: String, trim: true },
	orderDate: { type: Date },
	statement: { type: String },
	hisOrher: { type: String, trim: true },
	nameofChildren: { type: String },

	dateIssued: { type: Date },

	copyReceivedBy: { type: String, trim: true },
	dateReceived: { type: Date },
	servedBy: { type: String, trim: true },

	punongBarangay: { type: String, trim: true },
	unavailabledate: { type: Date },
	time: { type: String, trim: true },
	barangaykagawad: { type: String, trim: true },

	// keep links to other models for internal use
	reportID: { type: mongoose.Schema.Types.ObjectId, ref: 'IncidentReport' },
	issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'BarangayOfficial' },

	// expiry/status
	expiryDate: { type: Date },
	status: {
		type: String,
		enum: ['Active', 'Expired', 'Revoked'],
		default: 'Active',
		trim: true
	}
,
    // Soft-delete support
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date }
}, {
	timestamps: true
});

// Indexes for common queries
// Note: 'bpoID' has `unique: true` in the field definition above; avoid duplicating the index.
bpoSchema.index({ controlNO: 1 });
bpoSchema.index({ reportID: 1 });
bpoSchema.index({ status: 1 });
bpoSchema.index({ expiryDate: 1 });

// Method to check expiration
bpoSchema.methods.isExpired = function() {
	if (!this.expiryDate) return false;
	return Date.now() >= this.expiryDate.getTime();
};

// Pre-save middleware: ensure dateIssued is set and update status if expired
bpoSchema.pre('save', function(next) {
	// Ensure dateIssued exists
	if (!this.dateIssued) this.dateIssued = new Date();

	// If expiryDate not set, compute it as 15 days after dateIssued
	if (!this.expiryDate && this.dateIssued) {
		const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
		this.expiryDate = new Date(this.dateIssued.getTime() + FIFTEEN_DAYS_MS);
	}

	// Determine status based on dateIssued and expiryDate
	const now = Date.now();
	if (this.expiryDate) {
		if (this.expiryDate.getTime() <= now) {
			this.status = 'Expired';
		} else if (this.dateIssued && this.dateIssued.getTime() <= now) {
			// Currently within active window
			this.status = 'Active';
		} else {
			// dateIssued is in the future but expiry is later; keep Active (issued) by default
			this.status = this.status || 'Active';
		}
	}
	next();
});

// Static helpers
bpoSchema.statics.getActiveBPOs = function() {
	return this.find({ status: 'Active' }).populate('reportID').populate('issuedBy');
};

bpoSchema.statics.getBPOsByStatus = function(status) {
	return this.find({ status }).populate('reportID').populate('issuedBy');
};

// Virtual: time until expiry in milliseconds
bpoSchema.virtual('timeUntilExpiry').get(function() {
	if (!this.expiryDate) return null;
	return this.expiryDate.getTime() - Date.now();
});

const BPO = mongoose.model('BPO', bpoSchema);

module.exports = BPO;
