// src/lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export function initFirebase() {
  if (!getApps().length) initializeApp(firebaseConfig);
}

export async function exchangeCustomTokenForIdToken(customToken) {
  initFirebase();
  const auth = getAuth();
  const userCredential = await signInWithCustomToken(auth, customToken);
  const idToken = await userCredential.user.getIdToken();
  return idToken;
}

export default { initFirebase, exchangeCustomTokenForIdToken };
