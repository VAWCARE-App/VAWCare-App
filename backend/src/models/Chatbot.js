const mongoose = require('mongoose');
const crypto = require('crypto');

const chatbotSchema = new mongoose.Schema({
    chatID: {
        type: String,
        required: [true, 'Chat ID is required'],
        unique: true,
        trim: true
    },
    victimID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Victim',
        required: [true, 'Victim ID is required']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        set: function(message) {
            // Encrypt message before saving
            try {
                const algorithm = 'aes-256-cbc';
                const key = process.env.ENCRYPTION_KEY || 'your-encryption-key';
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
                let encrypted = cipher.update(message, 'utf8', 'hex');
                encrypted += cipher.final('hex');
                return `${iv.toString('hex')}:${encrypted}`;
            } catch (error) {
                console.error('Message encryption failed:', error);
                return message;
            }
        },
        get: function(encryptedMessage) {
            // Decrypt message when retrieving
            try {
                const algorithm = 'aes-256-cbc';
                const key = process.env.ENCRYPTION_KEY || 'your-encryption-key';
                const [ivHex, encrypted] = encryptedMessage.split(':');
                const iv = Buffer.from(ivHex, 'hex');
                const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
                let decrypted = decipher.update(encrypted, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return decrypted;
            } catch (error) {
                console.error('Message decryption failed:', error);
                return encryptedMessage;
            }
        }
    },
    response: {
        type: String,
        set: function(response) {
            // Encrypt response before saving
            try {
                const algorithm = 'aes-256-cbc';
                const key = process.env.ENCRYPTION_KEY || 'your-encryption-key';
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
                let encrypted = cipher.update(response, 'utf8', 'hex');
                encrypted += cipher.final('hex');
                return `${iv.toString('hex')}:${encrypted}`;
            } catch (error) {
                console.error('Response encryption failed:', error);
                return response;
            }
        },
        get: function(encryptedResponse) {
            // Decrypt response when retrieving
            try {
                const algorithm = 'aes-256-cbc';
                const key = process.env.ENCRYPTION_KEY || 'your-encryption-key';
                const [ivHex, encrypted] = encryptedResponse.split(':');
                const iv = Buffer.from(ivHex, 'hex');
                const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
                let decrypted = decipher.update(encrypted, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return decrypted;
            } catch (error) {
                console.error('Response decryption failed:', error);
                return encryptedResponse;
            }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true // This will add createdAt and updatedAt timestamps
});

// Create indexes for faster querying
chatbotSchema.index({ chatID: 1 }, { unique: true });
chatbotSchema.index({ victimID: 1 });
chatbotSchema.index({ createdAt: -1 });

// Static method to get chat history for a victim
chatbotSchema.statics.getChatHistory = function(victimID) {
    return this.find({ victimID })
        .sort({ createdAt: 1 })
        .populate('victimID');
};

// Method to add response to a message
chatbotSchema.methods.addResponse = async function(response) {
    this.response = response;
    return await this.save();
};

const Chatbot = mongoose.model('Chatbot', chatbotSchema);

module.exports = Chatbot;