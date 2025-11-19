const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Initialize the admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
