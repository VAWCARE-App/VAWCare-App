const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger/swagger');
console.time('Server Load Time');
// Load environment variables silently
dotenv.config({ silent: true });

console.time('DB Connection Time');
// Connect to MongoDB
connectDB();
console.timeEnd('DB Connection Time');
const app = express();

// CORS configuration to allow credentials (cookies)
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,  // Allow credentials (cookies)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-actor-business-id', 'x-actor-id', 'x-actor-type', 'cache-control', 'x-internal-key'],
    optionsSuccessStatus: 200
};

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors(corsOptions));
app.use(cookieParser());

const allowedDomains = [process.env.FRONTEND_URL || 'http://localhost:5173'];

app.use((req, res, next) => {
    // Domain check
    const origin = req.headers.origin;
    if (origin && !allowedDomains.includes(origin)) {
        return res.status(403).json({ error: 'Forbidden: Invalid origin' });
    }

    // Internal API key check
    const internalKey = req.headers['x-internal-key'];
    if (!internalKey || internalKey !== process.env.INTERNAL_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
    }

    next();
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Routes
const victimRoutes = require('./routes/victimRoutes');
const officialRoutes = require('./routes/officialRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const casesRoutes = require('./routes/casesRoutes');
const dssRoutes = require('./routes/dssRoutes');
const bpoRoutes = require('./routes/bpoRoutes');
const logRoutes = require('./routes/logRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const sseRoutes = require('./routes/sseRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analayticsRoutes');
const incidentSubtypesRoutes = require('./routes/incidentSubtypesRoutes');

// Notification routes
app.use('/api/notifications', notificationRoutes);

// SSE route
app.use('/api/sse', sseRoutes);

// Use routes
app.use('/api/victims', victimRoutes);
app.use('/api/officials', officialRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/dss', dssRoutes);
app.use('/api/bpo', bpoRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/metadata', incidentSubtypesRoutes);

// Health check - lightweight endpoint for manual connectivity tests
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});


// Debug endpoint - show incoming cookies and headers
app.get('/api/debug/cookies', (req, res) => {
    res.json({
        success: true,
        cookies: req.cookies,
        authToken: req.cookies?.authToken ? 'Present (length: ' + req.cookies.authToken.length + ')' : 'Not found',
        headers: {
            authorization: req.headers.authorization || 'Not provided',
            'content-type': req.headers['content-type'] || 'Not provided'
        },
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[ERROR HANDLER]', {
        message: err.message,
        statusCode: err.statusCode,
        method: req.method,
        path: req.path,
        size: req.get('content-length') || 'unknown'
    });

    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.timeEnd('Server Load Time');
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log('\x1b[36m%s\x1b[0m', `Swagger documentation available at: http://localhost:${PORT}/api-docs`);
    console.log('\x1b[36m%s\x1b[0m', '-----------------------------------------------------------');
    // Background supervisor for alerts: keep server-side authority for alert lifecycle
    try {
        const ALERT_POLL_MS = Number(process.env.ALERT_POLL_MS) || 30000; // default 30s
        const ALERT_MAX_ACTIVE_MS = process.env.ALERT_MAX_ACTIVE_MS ? Number(process.env.ALERT_MAX_ACTIVE_MS) : null; // optional
        const alerts = require('./models/Alert');
        setInterval(async () => {
            try {
                const activeCount = await alerts.countDocuments({ status: 'Active' });
                if (process.env.ALERT_DEBUG) console.log(`Alert supervisor: active alerts=${activeCount}`);
                const ALERT_MAX_ACTIVE_MS = 1000 * 60 * 60; // 1 hour countdown timer before auto-resolve
                if (ALERT_MAX_ACTIVE_MS && Number.isFinite(ALERT_MAX_ACTIVE_MS)) {
                    const cutoff = new Date(Date.now() - ALERT_MAX_ACTIVE_MS);
                    const stale = await alerts.find({ status: 'Active', createdAt: { $lte: cutoff } }).limit(100).lean();
                    for (const s of stale) {
                        try {
                            await alerts.updateOne({ _id: s._id }, { $set: { status: 'Resolved', resolvedAt: new Date(), durationMs: Date.now() - new Date(s.createdAt).getTime(), durationStr: 'Auto-resolved' } });
                            if (process.env.ALERT_DEBUG) console.log('Auto-resolved alert', s._id);
                        } catch (e) { console.warn('Failed to auto-resolve alert', s._id, e && e.message); }
                    }
                }
            } catch (e) { console.warn('Alert supervisor iteration failed', e && e.message); }
        }, ALERT_POLL_MS);
        // BPO supervisor: mark expired BPOs
        try {
            const BPO = require('./models/BPO');
            const BPO_POLL_MS = Number(process.env.BPO_POLL_MS) || 30000;
            setInterval(async () => {
                try {
                    const now = new Date();
                    const expired = await BPO.find({ status: 'Active', expiryDate: { $lte: now } }).limit(200).lean();
                    if (expired && expired.length > 0) {
                        const ids = expired.map(e => e._id);
                        await BPO.updateMany({ _id: { $in: ids } }, { $set: { status: 'Expired', updatedAt: new Date() } });
                        if (process.env.BPO_DEBUG) console.log(`BPO supervisor: marked ${ids.length} BPO(s) expired`);
                    } else {
                        if (process.env.BPO_DEBUG) console.log('BPO supervisor: no expired BPOs this iteration');
                    }
                } catch (e) { console.warn('BPO supervisor iteration failed', e && e.message); }
            }, BPO_POLL_MS);
        } catch (e) { console.warn('Failed to start BPO supervisor', e && e.message); }
    } catch (e) { console.warn('Failed to start alert supervisor', e && e.message); }
});