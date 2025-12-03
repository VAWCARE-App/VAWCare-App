const mongoose = require('mongoose');

const remarkSchema = new mongoose.Schema({
    remarkID: {
        type: String,
        required: [true, 'Remark ID is required'],
        unique: true,
        trim: true
    },
    caseID: {
        type: String,
        required: [true, 'Case ID is required'],
        trim: true,
        index: true
    },
    caseObjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cases',
        required: false
    },
    content: {
        type: String,
        required: [true, 'Remark content is required'],
        trim: true,
        minlength: [1, 'Remark content cannot be empty']
    },
    actorType: {
        type: String,
        enum: ['admin', 'official', 'victim'],
        required: [true, 'Actor type is required'],
        default: 'official'
    },
    actorID: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: function() {
            // Return the appropriate model based on actorType
            return this.actorType === 'admin' ? 'Admin' : 'BarangayOfficials';
        }
    },
    actorName: {
        type: String,
        required: false,
        trim: true
    },
    actorBusinessId: {
        type: String,
        required: [true, 'Actor business ID is required'],
        trim: true
    },
    ipAddress: {
        type: String,
        required: false,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
});

// Index for efficient querying
remarkSchema.index({ caseID: 1, createdAt: -1 });
remarkSchema.index({ actorBusinessId: 1, createdAt: -1 });
remarkSchema.index({ isDeleted: 1, createdAt: -1 });

// Soft delete - exclude deleted remarks by default
function addNotDeletedConstraint() {
    const q = this.getQuery();
    if (q && Object.prototype.hasOwnProperty.call(q, 'isDeleted')) return;
    this.where({ isDeleted: { $ne: true } });
}

remarkSchema.pre(/^find/, addNotDeletedConstraint);
remarkSchema.pre('countDocuments', addNotDeletedConstraint);
remarkSchema.pre('findOneAndUpdate', function(next) {
    const q = this.getQuery();
    if (!Object.prototype.hasOwnProperty.call(q, 'isDeleted')) this.where({ isDeleted: { $ne: true } });
    next();
});

const Remark = mongoose.model('Remark', remarkSchema);

module.exports = Remark;
