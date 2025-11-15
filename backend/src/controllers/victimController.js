const asyncHandler = require('express-async-handler');
const Victim = require('../models/Victims');
const Photos = require('../models/Photos');
const IncidentReport = require('../models/IncidentReports');
const Alert = require('../models/Alert');
const Chatbot = require('../models/Chatbot');
const admin = require('../config/firebase-config');
const { sendMail } = require('../utils/sendmail');
const { setAuthCookie } = require('../utils/cookieUtils');
const { broadcast } = require('../utils/sse');
const Notification = require('../models/Notification');

// @desc    Register victim
// @route   POST /api/victims/register  
// @access  Public
const registerVictim = asyncHandler(async (req, res) => {
    const body = req.body || {};
    let {
        victimUsername,
        victimPassword,
        victimAccount = 'anonymous',
        victimType,
        victimEmail,
        firstName,
        middleInitial,
        lastName,
        address,
        contactNumber,
        emergencyContacts,
        location
    } = body;

    // If no payload provided or explicitly anonymous ticket requested, generate a ticket-based anonymous account
    let generatedTicket = null;
    if (!Object.keys(body).length || victimAccount === 'anonymous') {
        // ensure anonymous flow: if caller didn't provide username/password, generate them
        if (!victimUsername) {
            victimUsername = `anon_${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`;
        }
        if (!victimPassword) {
            // generate a short random password (will be hashed), include a symbol to satisfy strong password validators if any
            victimPassword = (Math.random().toString(36).slice(-8) + 'A1!').slice(0, 12);
        }
        // mark as anonymous explicitly
        victimAccount = 'anonymous';
        generatedTicket = Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    console.log('\n=== Starting Victim Registration Process ===');
    console.log('Request Body:', {
        victimUsername,
        victimPassword: '***HIDDEN***',
        victimAccount,
        victimType,
        victimEmail,
        firstName
    });

    try {
        // Check if username already exists (skip for purely anonymous ticket collisions handled by regeneration)
        const existingVictim = await Victim.findOne({ victimUsername });
        if (existingVictim) {
            // If username collision happens for anonymous generated username, regenerate a new one and proceed
            if (victimAccount === 'anonymous' && generatedTicket) {
                victimUsername = `anon_${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`;
            } else {
                console.log(`Registration failed: Username ${victimUsername} already exists`);
                res.status(409);
                throw new Error('Username already exists');
            }
        }

        // For regular accounts, check if email already exists
        if (victimAccount === 'regular' && victimEmail) {
            const existingEmail = await Victim.findOne({ victimEmail });
            if (existingEmail) {
                console.log(`Registration failed: Email ${victimEmail} already exists`);
                res.status(409);
                throw new Error('Email already registered');
            }
        }

        console.log(`Attempting to register new ${victimAccount} victim:`);
        console.log('- Username:', victimUsername);
        console.log('- Account Type:', victimAccount);
        console.log('- Email:', victimEmail || 'Not provided');
        console.log('- Victim Type:', victimType || 'Not specified');

        // Create victim data object
        const victimData = {
            victimAccount,
            victimUsername,
            victimPassword, // This will be hashed by the pre-save middleware
            // persist generated ticket for anonymous flow so it can be used to login
            ...(generatedTicket ? { ticket: generatedTicket } : {}),
            firstName: firstName || (victimAccount === 'anonymous' ? 'Anonymous' : undefined),
            middleInitial: middleInitial || '',
            lastName: lastName || (victimAccount === 'anonymous' ? 'User' : undefined),
            address: address || (victimAccount === 'anonymous' ? '' : undefined),
            contactNumber: contactNumber || (victimAccount === 'anonymous' ? '' : undefined),
            // only set location if caller provided one; otherwise leave undefined so Mongo doesn't save zeros
            ...(location && typeof location === 'object' && (location.lat !== undefined && location.lng !== undefined) ? { location } : {}),
            firebaseUid: null
        };

        // Add optional fields for regular accounts
        if (victimAccount === 'regular') {
            victimData.victimType = victimType;
            victimData.victimEmail = victimEmail;
            victimData.emergencyContacts = emergencyContacts || [];
        }

        console.log('Creating victim document with the following data:');
        console.log(JSON.stringify({ ...victimData, victimPassword: '***HIDDEN***' }, null, 2));

        console.log(`Creating new ${victimAccount} victim record...`);
        // If ticket was generated, ensure it doesn't collide with existing records
        if (generatedTicket) {
            let exists = await Victim.findOne({ ticket: generatedTicket });
            let attempts = 0;
            while (exists && attempts < 5) {
                generatedTicket = Math.random().toString(36).substring(2, 10).toUpperCase();
                victimData.ticket = generatedTicket;
                exists = await Victim.findOne({ ticket: generatedTicket });
                attempts += 1;
            }
        }

        const victim = new Victim(victimData);
        await victim.save(); // This triggers the pre-save middleware for password hashing

        console.log('\nMongoDB Registration Success:');
        console.log('- Victim ID:', victim._id);
        console.log('- VictimID:', victim.victimID);
        console.log('- Username:', victim.victimUsername);
        console.log('- Account Type:', victim.victimAccount);

        // Try Firebase user creation (optional)
        console.log('\nAttempting Firebase user creation...');
        let firebaseUid = null;
        let customToken = null;

        try {
            if (admin && admin.auth) {
                if (victimAccount === 'regular' && victimEmail) {
                    const userRecord = await admin.auth().createUser({
                        email: victimEmail,
                        password: victimPassword,
                        displayName: `${firstName} ${lastName}`,
                        emailVerified: false
                    });
                    firebaseUid = userRecord.uid;

                    await admin.auth().setCustomUserClaims(userRecord.uid, {
                        role: 'victim',
                        isAnonymous: false
                    });
                } else {
                    const userRecord = await admin.auth().createUser({
                        displayName: `Anonymous User`,
                        password: victimPassword
                    });
                    firebaseUid = userRecord.uid;

                    await admin.auth().setCustomUserClaims(userRecord.uid, {
                        role: 'victim',
                        isAnonymous: true,
                        victimUsername: victimUsername
                    });
                }

                customToken = await admin.auth().createCustomToken(firebaseUid);

                victim.firebaseUid = firebaseUid;
                await victim.save();

                console.log('\nFirebase User Created Successfully:');
                console.log('- Firebase UID:', firebaseUid);
                console.log('- Custom Token Generated:', customToken ? 'Yes' : 'No');
            }
        } catch (firebaseError) {
            console.log('\nFirebase Error:', firebaseError.message);
            console.log('Continuing without Firebase - MongoDB user is still valid');
        }

        console.log('\n=== Registration Complete ===');
        console.log('Final victim state:', {
            id: victim._id,
            victimID: victim.victimID,
            username: victim.victimUsername,
            accountType: victim.victimAccount,
            firebaseUid: victim.firebaseUid || 'Not created'
        });

        res.status(201).json({
            success: true,
            message: 'Victim registered successfully',
            data: {
                token: customToken,
                victim: {
                    id: victim._id,
                    victimID: victim.victimID,
                    victimAccount: victim.victimAccount,
                    victimUsername: victim.victimUsername,
                    firebaseUid: victim.firebaseUid,
                    firstName: victim.firstName
                }
            }
        });
    } catch (error) {
        console.log('\n=== Registration Error ===');
        console.log('Error Code:', error.code || 'No error code');
        console.log('Error Message:', error.message);

        if (error.code === 'auth/email-already-exists') {
            res.status(400);
            throw new Error('Email already registered');
        }
        throw error;
    }
});

// @desc    Login victim
// @route   POST /api/victims/login
// @access  Public
const loginVictim = asyncHandler(async (req, res) => {
    const { identifier, password } = req.body;

    try {
        // 1. Find user
        let victim = await Victim.findOne({ victimUsername: identifier })
            || await Victim.findOne({ victimEmail: identifier });

        if (!victim) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // 2. Verify password
        const isMatch = await victim.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // 3. Ensure Firebase UID exists
        if (!victim.firebaseUid) {
            let firebaseUser;
            try {
                firebaseUser = await admin.auth().createUser({
                    email: victim.victimEmail || undefined,
                    displayName: victim.victimUsername,
                });
                victim.firebaseUid = firebaseUser.uid;
                await victim.save();
            } catch (err) {
                // If duplicate email, fetch existing user instead
                if (err.code === "auth/email-already-exists") {
                    firebaseUser = await admin.auth().getUserByEmail(victim.victimEmail);
                    victim.firebaseUid = firebaseUser.uid;
                    await victim.save();
                } else {
                    console.error("Firebase UID creation failed:", err.message);
                    return res.status(500).json({ success: false, message: "Firebase error" });
                }
            }
        }

        // 4. Generate custom token
        const customToken = await admin.auth().createCustomToken(victim.firebaseUid, {
            role: "victim",
            isAnonymous: victim.victimAccount === "anonymous",
            victimUsername: victim.victimUsername
        });

        // 5. Respond with custom token - frontend will exchange it for ID token
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token: customToken,
                victim: {
                    id: victim._id,
                    victimID: victim.victimID,
                    victimAccount: victim.victimAccount,
                    victimUsername: victim.victimUsername,
                    victimType: victim.victimType,
                    firstName: victim.victimAccount === "anonymous" ? "Anonymous" : victim.firstName
                }
            }
        });

        // record login in system logs (best-effort)
        try {
            const SystemLog = require('../models/SystemLogs');
            const forwarded = (req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])) || null;
            const ipToRecord = forwarded ? String(forwarded).split(',')[0].trim() : req.ip;
            await SystemLog.createLog({
                logID: `LOG-${Date.now()}`,
                actorType: 'victim',
                actorId: victim._id,
                action: 'login',
                details: `Victim ${victim.victimID || victim.victimUsername} logged in`,
                ipAddress: ipToRecord,
                timestamp: new Date()
            });
            console.log('Recorded login system log for victim', victim.victimID || victim.victimUsername, 'ip=', ipToRecord);
        } catch (logErr) {
            console.warn('Failed to record victim login system log:', logErr && logErr.message, logErr);
        }

    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});



// @desc    Get victim profile
// @route   GET /api/victims/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
    const victim = await Victim.findOne({ firebaseUid: req.user.uid });

    if (victim) {
        res.status(200).json({
            success: true,
            data: {
                id: victim._id,
                victimID: victim.victimID,
                firebaseUid: victim.firebaseUid,
                victimEmail: victim.victimEmail,
                firstName: victim.firstName,
                middleInitial: victim.middleInitial,
                lastName: victim.lastName,
                address: victim.address,
                contactNumber: victim.contactNumber,
                receiveEmail: (typeof victim.receiveEmail === 'boolean') ? victim.receiveEmail : true,
                victimType: victim.victimType,
                isAnonymous: victim.isAnonymous,
                emergencyContacts: victim.emergencyContacts,
                location: victim.location
                // photo fields intentionally omitted to reduce payload size
            }
        });
    } else {
        res.status(404);
        throw new Error('Victim not found');
    }
});

// @desc    Update victim profile
// @route   PUT /api/victims/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    console.log("[updateProfile] Request body keys:", Object.keys(req.body));

    const victim = await Victim.findOne({ firebaseUid: req.user.uid });

    if (!victim) {
        res.status(404);
        throw new Error('Victim not found');
    }

    // Detect emergencyContacts changes so we can emit specific log actions
    const beforeEC = Array.isArray(victim.emergencyContacts) ? victim.emergencyContacts.map(ec => ({ name: ec.name || '', email: (ec.email || '').toLowerCase(), contactNumber: ec.contactNumber || '' })) : [];

    // Photo upload/processing removed: photo fields are no longer accepted
    let updateData = { ...req.body };


    // If client included photoData in the payload (admin-style save), persist it to Photos
    if (req.body.photoData && req.body.photoMimeType) {
        try {
            const rawBase64 = req.body.photoData;
            const mime = req.body.photoMimeType || 'image/jpeg';
            const photo = new Photos({
                owner: victim._id,
                ownerModel: 'Victim',
                mimeType: mime,
                image: rawBase64,
            });

            // Optional thumbnail generation (if sharp available)
            try {
                const sharp = require('sharp');
                const imgBuf = Buffer.from(rawBase64, 'base64');
                const thumbBuf = await sharp(imgBuf).resize({ width: 300 }).jpeg({ quality: 70 }).toBuffer();
                photo.thumbnail = thumbBuf.toString('base64');
            } catch (e) {
                if (e && e.code !== 'MODULE_NOT_FOUND') console.warn('[updateProfile] thumbnail generation failed:', e && e.message);
            }

            await photo.save();
            delete updateData.photoData;
            delete updateData.photoMimeType;
        } catch (e) {
            console.warn('Failed to save photo from profile update:', e && e.message);
            delete updateData.photoData;
            delete updateData.photoMimeType;
        }

    }

    const updatedVictim = await Victim.findByIdAndUpdate(
        victim._id,
        updateData,
        { new: true, runValidators: true }
    );


    // Compare after update and emit logs for added/removed/updated emergency contacts
    try {
        const afterEC = Array.isArray(updatedVictim.emergencyContacts) ? updatedVictim.emergencyContacts.map(ec => ({ name: ec.name || '', email: (ec.email || '').toLowerCase(), contactNumber: ec.contactNumber || '' })) : [];
        const added = afterEC.filter(a => !beforeEC.some(b => b.email && b.email === a.email));
        const removed = beforeEC.filter(b => !afterEC.some(a => a.email && a.email === b.email));
        const possiblyUpdated = afterEC.filter(a => beforeEC.some(b => b.email && b.email === a.email));

        const { recordLog } = require('../middleware/logger');
        // Record general profile update
        try { await recordLog({ req, actorType: 'victim', actorId: updatedVictim._id, action: 'victim_profile_updated', details: `Victim profile updated ${updatedVictim.victimID || updatedVictim._id}` }); } catch (e) { console.warn('Failed to record victim profile update log', e && e.message); }

        for (const a of added) {
            try { await recordLog({ req, actorType: 'victim', actorId: updatedVictim._id, action: 'emergency_contact_added', details: `Emergency contact added: ${a.email || a.name}` }); } catch (e) { /* ignore */ }
        }
        for (const r of removed) {
            try { await recordLog({ req, actorType: 'victim', actorId: updatedVictim._id, action: 'emergency_contact_removed', details: `Emergency contact removed: ${r.email || r.name}` }); } catch (e) { /* ignore */ }
        }
        for (const p of possiblyUpdated) {
            // naive diff: if contactNumber or name differ
            const before = beforeEC.find(b => b.email === p.email) || {};
            if ((before.contactNumber || '') !== (p.contactNumber || '') || (before.name || '') !== (p.name || '')) {
                try { await recordLog({ req, actorType: 'victim', actorId: updatedVictim._id, action: 'emergency_contact_updated', details: `Emergency contact updated: ${p.email || p.name}` }); } catch (e) { /* ignore */ }
            }
        }
    } catch (e) {
        console.warn('Failed to analyze emergencyContacts diff for logs', e && e.message);
    }

    res.status(200).json({
        success: true,
        data: updatedVictim
    });
});

// @desc    Verify email address
// @route   POST /api/victims/verify-email
// @access  Private
const verifyEmail = asyncHandler(async (req, res) => {
    const { code } = req.body;

    try {
        if (admin && admin.auth) {
            const firebaseUser = await admin.auth().getUser(req.user.uid);

            await admin.auth().updateUser(req.user.uid, {
                emailVerified: true
            });
        }

        res.status(200).json({
            success: true,
            message: 'Email verified successfully'
        });
    } catch (error) {
        res.status(400);
        throw new Error('Email verification failed');
    }
});

// @desc    Verify phone number
// @route   POST /api/victims/verify-phone
// @access  Private
const verifyPhone = asyncHandler(async (req, res) => {
    const { phoneNumber, code } = req.body;

    try {
        if (admin && admin.auth) {
            await admin.auth().updateUser(req.user.uid, {
                phoneNumber: phoneNumber
            });
        }

        await Victim.findOneAndUpdate(
            { firebaseUid: req.user.uid },
            { contactNumber: phoneNumber },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Phone number verified successfully'
        });
    } catch (error) {
        res.status(400);
        throw new Error('Phone verification failed');
    }
});

// @desc    Upload or replace victim profile photo (base64 payload)
// @route   POST /api/victims/profile/photo
// @access  Private
const uploadPhoto = asyncHandler(async (req, res) => {
    // Support two upload modes:
    // 1) multipart/form-data with file field 'photo' (preferred — binary upload)
    // 2) JSON body with { photoData: '<base64>', photoMimeType: 'image/png' }
    const { photoData, photoMimeType } = req.body || {};

    // find victim by firebase uid
    const victim = await Victim.findOne({ firebaseUid: req.user.uid });
    if (!victim) {
        res.status(404);
        throw new Error('Victim not found');
    }
    let finalBuffer = null;
    let finalMime = null;

    // If multer parsed a file, use it (binary upload)
    if (req.file && req.file.buffer) {
        finalBuffer = req.file.buffer;
        finalMime = req.file.mimetype || 'application/octet-stream';
    } else if (photoData && photoMimeType) {
        // Otherwise fall back to base64 JSON payload
        const approxSize = Buffer.from(photoData, 'base64').length;
        if (approxSize > 4 * 1024 * 1024) {
            res.status(413);
            throw new Error('Photo too large');
        }
        finalBuffer = Buffer.from(photoData, 'base64');
        finalMime = photoMimeType;
    } else {
        res.status(400);
        throw new Error('Missing photo data (multipart "photo" file or JSON photoData)');
    }

    // If sharp is available, resize/compress the main image to a reasonable max width
    try {
        const sharp = require('sharp');
        // Resize if width > 1920px, convert to JPEG to reduce size where appropriate
        const img = sharp(finalBuffer);
        const meta = await img.metadata();
        if (meta && meta.width && meta.width > 1920) {
            finalBuffer = await img.resize({ width: 1920 }).jpeg({ quality: 80 }).toBuffer();
            finalMime = 'image/jpeg';
        } else {
            // For non-resize path, still optimize/normalize to JPEG for size savings (optional)
            finalBuffer = await img.jpeg({ quality: 85 }).toBuffer();
            finalMime = 'image/jpeg';
        }
    } catch (e) {
        // sharp not installed — continue with original buffer
        if (e && e.code !== 'MODULE_NOT_FOUND') console.warn('[uploadPhoto] sharp processing failed:', e && e.message);
    }

    // Save a new Photos document storing the base64 string directly (mark public: true)
    const photo = new Photos({
        owner: victim._id,
        ownerModel: 'Victim',
        mimeType: finalMime || 'application/octet-stream',
        image: finalBuffer.toString('base64'),
    });

    // Try to generate a small thumbnail if 'sharp' is available
    try {
        const sharp = require('sharp');
        const thumbBuf = await sharp(finalBuffer).resize({ width: 300 }).jpeg({ quality: 70 }).toBuffer();
        photo.thumbnail = thumbBuf.toString('base64');
    } catch (e) {
        if (e && e.code !== 'MODULE_NOT_FOUND') console.warn('[uploadPhoto] thumbnail generation failed:', e && e.message);
    }

    await photo.save();

    res.status(201).json({ success: true, message: 'Photo uploaded', data: { photoId: photo._id } });
});

// @desc    Get latest public profile photo for current victim
// @route   GET /api/victims/profile/photo
// @access  Private
const getPhoto = asyncHandler(async (req, res) => {
    const victim = await Victim.findOne({ firebaseUid: req.user.uid });
    if (!victim) {
        res.status(404);
        throw new Error('Victim not found');
    }

    const photo = await Photos.findOne({ owner: victim._id }).sort({ createdAt: -1 }).lean();
    if (!photo) {
        return res.status(200).json({ success: true, data: null });
    }

    // Prefer returning a small thumbnail if available (faster for UI), otherwise return the main image
    let base64 = null;
    let mime = photo.mimeType || 'image/jpeg';
    try {
        if (photo.thumbnail && typeof photo.thumbnail === 'string') {
            base64 = photo.thumbnail;
            mime = 'image/jpeg'; // thumbnails are generated as JPEG
        } else if (typeof photo.image === 'string') {
            base64 = photo.image;
            mime = photo.mimeType || mime;
        } else if (photo.image && photo.image.buffer) {
            base64 = Buffer.from(photo.image.buffer).toString('base64');
        }
    } catch (e) {
        console.warn('[getPhoto] failed to normalize photo to base64:', e && e.message);
    }

    res.status(200).json({ success: true, data: { photoData: base64, photoMimeType: mime, photoId: photo._id } });
});

// @desc    Get raw photo bytes (suitable for <img src="/api/..../raw")
// @route   GET /api/victims/profile/photo/raw
// @access  Private
const getPhotoRaw = asyncHandler(async (req, res) => {
    const victim = await Victim.findOne({ firebaseUid: req.user.uid });
    if (!victim) {
        res.status(404);
        throw new Error('Victim not found');
    }

    const photo = await Photos.findOne({ owner: victim._id }).sort({ createdAt: -1 }).lean();
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    let buf = null;
    if (typeof photo.image === 'string') buf = Buffer.from(photo.image, 'base64');
    else if (Buffer.isBuffer(photo.image)) buf = photo.image;
    else if (photo.image && photo.image.buffer) buf = Buffer.from(photo.image.buffer);

    if (!buf) {
        return res.status(500).json({ success: false, message: 'Invalid photo data' });
    }

    // Compute ETag for conditional GETs
    try {
        const crypto = require('crypto');
        const etag = crypto.createHash('md5').update(buf).digest('hex');
        res.setHeader('ETag', etag);
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {
            return res.status(304).end();
        }
    } catch (e) {
        // ignore etag failures
    }

    res.setHeader('Content-Type', photo.mimeType || 'image/jpeg');
    // cache for 1 week by default; clients/edge caches can cache in front of server
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    res.send(buf);
});

// @desc    Get thumbnail image bytes (if available), otherwise try to generate if 'sharp' present
// @route   GET /api/victims/profile/photo/thumbnail
// @access  Private
const getPhotoThumbnail = asyncHandler(async (req, res) => {
    const victim = await Victim.findOne({ firebaseUid: req.user.uid });
    if (!victim) {
        res.status(404);
        throw new Error('Victim not found');
    }

    const photo = await Photos.findOne({ owner: victim._id }).sort({ createdAt: -1 }).lean();
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found' });

    // If thumbnail stored, return it
    if (photo.thumbnail && typeof photo.thumbnail === 'string') {
        const buf = Buffer.from(photo.thumbnail, 'base64');
        try {
            const crypto = require('crypto');
            const etag = crypto.createHash('md5').update(buf).digest('hex');
            res.setHeader('ETag', etag);
            const ifNoneMatch = req.headers['if-none-match'];
            if (ifNoneMatch && ifNoneMatch === etag) return res.status(304).end();
        } catch (e) { }
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        return res.send(buf);
    }

    // Otherwise, attempt to generate on-the-fly if sharp is available
    let originalBuf = null;
    if (typeof photo.image === 'string') originalBuf = Buffer.from(photo.image, 'base64');
    else if (Buffer.isBuffer(photo.image)) originalBuf = photo.image;
    else if (photo.image && photo.image.buffer) originalBuf = Buffer.from(photo.image.buffer);

    if (!originalBuf) return res.status(500).json({ success: false, message: 'Invalid photo data' });

    try {
        const sharp = require('sharp');
        const thumb = await sharp(originalBuf).resize({ width: 300 }).jpeg({ quality: 70 }).toBuffer();
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        return res.send(thumb);
    } catch (e) {
        // sharp not available or generation failed — fallback to original image
        console.warn('[getPhotoThumbnail] sharp unavailable or failed, returning original image:', e && e.message);
        res.setHeader('Content-Type', photo.mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        return res.send(originalBuf);
    }
});

// @desc    Submit anonymous report
// @route   POST /api/victims/anonymous/report
// @access  Public
const submitAnonymousReport = asyncHandler(async (req, res) => {
    const { incident, location, description } = req.body;

    try {
        let anonymousUser;

        if (admin && admin.auth) {
            anonymousUser = await admin.auth().createUser({
                disabled: false,
                emailVerified: false
            });

            await admin.auth().setCustomUserClaims(anonymousUser.uid, {
                role: 'victim',
                isAnonymous: true
            });
        }

        // Save the victim record and include firebaseUid
        const victim = await Victim.create({
            firebaseUid: anonymousUser?.uid || null,
            isAnonymous: true,
            location: location || {}
        });

        // Generate a custom token for the anonymous Firebase user so the frontend can sign them in
        let anonymousCustomToken = null;
        if (anonymousUser && admin && admin.auth) {
            try {
                anonymousCustomToken = await admin.auth().createCustomToken(anonymousUser.uid, {
                    role: 'victim',
                    isAnonymous: true
                });
            } catch (tokenErr) {
                console.error('Failed to create custom token for anonymous user:', tokenErr);
            }
        }

        const report = {
            victimId: victim._id,
            incident,
            description,
            location,
            isAnonymous: true,
            submittedAt: new Date()
        };

        res.status(201).json({
            success: true,
            message: 'Anonymous report submitted successfully',
            data: {
                reportId: report._id,
                trackingNumber: Math.random().toString(36).substring(7).toUpperCase(),
                token: anonymousCustomToken
            }
        });
        try { const { recordLog } = require('../middleware/logger'); await recordLog({ req, actorType: 'victim', actorId: victim._id, action: 'report_submission', details: `Anonymous report submitted id=${report._id}` }); } catch (e) { console.warn('Failed to record anonymous report log', e && e.message); }
    } catch (error) {
        res.status(500);
        throw new Error('Error submitting anonymous report');
    }
});

// @desc    Send anonymous alert
// @route   POST /api/victims/anonymous/alert
// @access  Public
const sendAnonymousAlert = asyncHandler(async (req, res) => {
    const { location, alertType, victimID } = req.body;

    console.log('sendAnonymousAlert payload:', JSON.stringify(req.body));

    try {
        // Require victimID because your model enforces it
        if (!victimID) {
            res.status(400);
            throw new Error('victimID is required for anonymous alerts');
        }

        // Duplicate suppression: if the same victim has an Active alert created within the
        // last CONFIRM_MS ms, return that existing alert instead of creating a new one.
        const AlertModel = require('../models/Alert');
        const CONFIRM_MS = 3000;
        const nowMs = Date.now();
        let alertDoc = null;
        try {
            const recent = await AlertModel.findOne({ victimID: victimID, status: 'Active' }).sort({ createdAt: -1 });
            if (recent && recent.createdAt) {
                const age = nowMs - new Date(recent.createdAt).getTime();
                if (age >= 0 && age < CONFIRM_MS) {
                    // Return existing recent active alert (avoid duplicate)
                    alertDoc = recent;
                }
            }
        } catch (e) {
            console.warn('Error checking recent alerts for duplicate suppression', e && e.message);
        }

        if (!alertDoc) {
            // Build and save a new alert document
            alertDoc = new AlertModel({
                alertID: `ALT${Date.now().toString().slice(-6)}`,
                victimID: victimID,
                type: alertType || 'Emergency',
                location: {
                    latitude: typeof location?.latitude === 'number' ? location.latitude : (typeof location?.lat === 'number' ? location.lat : 0),
                    longitude: typeof location?.longitude === 'number' ? location.longitude : (typeof location?.lng === 'number' ? location.lng : 0)
                },
                status: 'Active'
            });

            await alertDoc.save();

            const notif = await Notification.create({
                type: "new-alert",
                refId: alertDoc._id,
                typeRef: "Alert",
                message: `New alert triggered: ${alertDoc.alertID || alertDoc._id}`,
            });

            broadcast("new-notif", notif);
        }

        // Debug: log the saved document so we can verify the alert was persisted
        console.log('Alert saved to DB:', JSON.stringify({ id: alertDoc._id, alertID: alertDoc.alertID, createdAt: alertDoc.createdAt, status: alertDoc.status, victimID: alertDoc.victimID }));

        res.status(201).json({
            success: true,
            message: 'Anonymous alert created successfully',
            data: {
                alertId: String(alertDoc._id),
                alertID: alertDoc.alertID,
                createdAt: alertDoc.createdAt
            }
        });

        try {
            const { recordLog } = require('../middleware/logger');
            await recordLog({ req, actorType: 'victim', actorId: victimID, action: 'emergency_button', details: `Anonymous emergency alert sent type=${alertType}` });
        } catch (e) { console.warn('Failed to record anonymous alert log', e && e.message); }

        // Send SOS emails immediately when alert is created
        try {
            const { sendEmailsForAlert } = require('./alertController');
            // Create a pseudo-req object with user info for logging
            const emailReq = { ...req, user: { _id: victimID, role: 'victim' } };
            sendEmailsForAlert(alertDoc, emailReq).catch((e) => console.warn('sendEmailsForAlert failed on alert creation', e && e.message));
        } catch (e) {
            console.warn('Failed to send SOS emails on alert creation', e && e.message);
        }

    } catch (error) {
        console.error('Error saving anonymous alert:', error && error.message, error && error.errors);
        if (error && error.name === 'ValidationError') {
            res.status(400);
            throw new Error(Object.values(error.errors).map(e => e.message).join('; '));
        }
        res.status(500);
        throw new Error('Error sending anonymous alert');
    }
});

// @desc    Get simple metrics for the logged-in victim
// @route   GET /api/victims/metrics
// @access  Private
const getMetrics = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findOne({ firebaseUid: req.user.uid });
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        const totalReports = await IncidentReport.countDocuments({ victimID: victim._id });
        const openCases = await IncidentReport.countDocuments({
            victimID: victim._id,
            status: { $in: ['Open', 'Under Investigation'] },
        });

        // recentActivities: collect the victim's own actions (reports submitted, alerts sent, chatbot usage)
        const [reportDocs, alertDocs, chatDocs] = await Promise.all([
            IncidentReport.find({ victimID: victim._id })
                .sort({ dateReported: -1 })
                .limit(5)
                .select('reportID incidentType dateReported createdAt')
                .lean(),
            Alert.find({ victimID: victim._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('alertID type createdAt status')
                .lean(),
            Chatbot.find({ victimID: victim._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .select('chatID createdAt')
                .lean(),
        ]);

        const reportActivities = (reportDocs || []).map((r) => ({
            kind: 'report',
            title: `You submitted report ${r.reportID}${r.incidentType ? ` — ${r.incidentType}` : ''}`,
            time: r.dateReported || r.createdAt,
            note: null,
            id: r.reportID,
        }));

        const alertActivities = (alertDocs || []).map((a) => ({
            kind: 'alert',
            title: `You sent ${a.type} alert`,
            time: a.createdAt,
            note: null,
            id: a.alertID,
        }));

        const chatActivities = (chatDocs || []).map((c) => ({
            kind: 'chat',
            title: `You chatted with the assistant`,
            time: c.createdAt,
            note: null,
            id: c.chatID,
        }));

        // merge and sort by time desc, then take the most recent 5
        const merged = [...reportActivities, ...alertActivities, ...chatActivities]
            .filter((it) => it.time)
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 5);

        const recentActivities = merged;

        res.status(200).json({
            success: true,
            data: {
                totalReports,
                openCases,
                recentActivities,
            },
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error fetching metrics');
    }
});

// @desc    Get victim's reports (only their reports)
// @route   GET /api/victims/reports
// @access  Private
const getReports = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findOne({ firebaseUid: req.user.uid });
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        const reports = await IncidentReport.find({ victimID: victim._id })
            .sort({ dateReported: -1 })
            .select('-__v')
            .lean();

        res.status(200).json({
            success: true,
            data: reports,
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error fetching reports');
    }
});

// @desc    Update a report
// @route   PUT /api/victims/reports/:id
// @access  Private
const updateReport = asyncHandler(async (req, res) => {
    try {
        const victim = await Victim.findOne({ firebaseUid: req.user.uid });
        if (!victim) {
            res.status(404);
            throw new Error('Victim not found');
        }

        res.status(200).json({
            success: true,
            message: 'Report updated successfully'
        });
    } catch (error) {
        res.status(500);
        throw new Error('Error updating report');
    }
});
module.exports = {
    registerVictim,

    loginVictim,
    getProfile,
    getMetrics,
    verifyEmail,
    verifyPhone,
    updateProfile,
    submitAnonymousReport,
    sendAnonymousAlert,
    getReports,
    updateReport
    , uploadPhoto, getPhoto
    , getPhotoRaw, getPhotoThumbnail
};