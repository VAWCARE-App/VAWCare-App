const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    resourceID: {
        type: String,
        required: [true, 'Resource ID is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Resource name is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Resource type is required'],
        enum: {
            values: ['Shelter', 'Legal Aid Office', 'Medical Facility', 'Counseling Center', 'Crisis Hotline'],
            message: 'Please enter a valid resource type'
        },
        trim: true
    },
    number: {
        type: String,
        required: [true, 'Contact number is required'],
        trim: true,
        match: [/^(\+63|0)[0-9]{10}$/, 'Please enter a valid Philippine phone number']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true
    },
    availability: {
        type: String,
        required: [true, 'Availability status is required'],
        enum: {
            values: ['Open', 'Limited', 'Closed'],
            message: 'Availability must be either Open, Limited, or Closed'
        },
        default: 'Open',
        trim: true
    },
    location: {
        latitude: {
            type: Number
        },
        longitude: {
            type: Number
        }
    },
    operatingHours: {
        open: String,
        close: String
    }
}, {
    timestamps: true
});

// Create indexes for faster querying
resourceSchema.index({ resourceID: 1 }, { unique: true });
resourceSchema.index({ type: 1 });
resourceSchema.index({ availability: 1 });
resourceSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

// Static method to get resources by type
resourceSchema.statics.getResourcesByType = function(type) {
    return this.find({ type, availability: { $ne: 'Closed' } })
        .sort({ name: 1 });
};

// Static method to get available resources
resourceSchema.statics.getAvailableResources = function() {
    return this.find({ availability: { $ne: 'Closed' } })
        .sort({ type: 1, name: 1 });
};

// Static method to find nearby resources
resourceSchema.statics.findNearbyResources = function(latitude, longitude, maxDistance) {
    return this.find({
        availability: { $ne: 'Closed' },
        'location.latitude': {
            $gte: latitude - maxDistance,
            $lte: latitude + maxDistance
        },
        'location.longitude': {
            $gte: longitude - maxDistance,
            $lte: longitude + maxDistance
        }
    }).sort({ type: 1, name: 1 });
};

// Method to update availability
resourceSchema.methods.updateAvailability = async function(newAvailability) {
    if (!['Open', 'Limited', 'Closed'].includes(newAvailability)) {
        throw new Error('Invalid availability status');
    }
    this.availability = newAvailability;
    return await this.save();
};

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;