const admin = require('firebase-admin');
const asyncHandler = require('express-async-handler');

// Handle anonymous authentication
const handleAnonymous = asyncHandler(async (req, res, next) => {
    try {
        // If user is already authenticated, proceed
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            return next();
        }

        // Create anonymous account in Firebase
        const anonymousUser = await admin.auth().createUser({
            disabled: false,
            emailVerified: false
        });

        // Set anonymous custom claims
        await admin.auth().setCustomUserClaims(anonymousUser.uid, {
            role: 'victim',
            isAnonymous: true
        });

        // Create custom token for the anonymous user
        const customToken = await admin.auth().createCustomToken(anonymousUser.uid);

        // Add anonymous user info to request
        req.user = {
            uid: anonymousUser.uid,
            isAnonymous: true,
            role: 'victim'
        };

        // Add token to response headers for client use
        res.set('X-Anonymous-Token', customToken);
        
        next();
    } catch (error) {
        res.status(500);
        throw new Error('Error creating anonymous session');
    }
});

// Optional upgrade from anonymous to registered user
const upgradeAnonymous = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    try {
        // Get the anonymous user
        const anonymousUser = await admin.auth().getUser(req.user.uid);

        if (!anonymousUser.customClaims?.isAnonymous) {
            res.status(400);
            throw new Error('User is not anonymous');
        }

        // Update the user with email and password
        await admin.auth().updateUser(anonymousUser.uid, {
            email: email,
            password: password,
            emailVerified: false
        });

        // Update custom claims
        await admin.auth().setCustomUserClaims(anonymousUser.uid, {
            role: 'victim',
            isAnonymous: false
        });

        next();
    } catch (error) {
        res.status(500);
        throw new Error('Error upgrading anonymous account');
    }
});

// Check if request is from anonymous user
const isAnonymous = (req) => {
    return req.user?.isAnonymous === true;
};

module.exports = {
    handleAnonymous,
    upgradeAnonymous,
    isAnonymous
};
