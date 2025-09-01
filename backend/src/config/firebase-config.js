const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccountKey.json');

// Initialize the admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
