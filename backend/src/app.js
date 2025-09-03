const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger/swagger');

// Load environment variables silently
dotenv.config({ silent: true });

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
const victimRoutes = require('./routes/victimRoutes');
const officialRoutes = require('./routes/officialRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Use routes
app.use('/api/victims', victimRoutes);
app.use('/api/officials', officialRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log('\x1b[36m%s\x1b[0m', `Swagger documentation available at: http://localhost:${PORT}/api-docs`);
    console.log('\x1b[36m%s\x1b[0m', '-----------------------------------------------------------');
});
