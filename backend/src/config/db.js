const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        // Log more details about the error for debugging
        if (error.code === 8000) {
            console.error('Wrong database credentials');
        } else if (error.code === 'ENOTFOUND') {
            console.error('Could not reach database server');
        }
        process.exit(1);
    }
};

module.exports = connectDB;