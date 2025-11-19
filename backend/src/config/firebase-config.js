const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
let serviceAccount;
try {
  if (process.env.GOOGLE_CREDENTIALS) {
    console.log('📦 Loading Firebase credentials from GOOGLE_CREDENTIALS');
    serviceAccount = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_PROJECT_ID) {
    console.log('📦 Loading Firebase credentials from individual env variables');
    serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
    };
  } else {
    throw new Error('Firebase credentials not found in environment variables');
  }
} catch (err) {
  console.error('❌ Failed to load Firebase credentials:', err.message);
  throw err;
}

// Initialize the admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized successfully');
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', err.message);
  throw err;
}

module.exports = admin;
