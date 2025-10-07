// src/lib/api.js
import axios from "axios";
import { message } from 'antd';
import { exchangeCustomTokenForIdToken } from './firebase';

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    try {
      // Debug: log outgoing requests for easier tracing (including method and url)
      console.debug('[api] outgoing request', { method: config.method, url: config.baseURL ? `${config.baseURL}${config.url}` : config.url, hasAuth: !!token });
    } catch (e) {
      console.debug('[api] failed to log request', e && e.message);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const saveToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => {
  // Remove all authentication and actor-related keys from localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userType");
  localStorage.removeItem('actorId');
  localStorage.removeItem('actorType');
  localStorage.removeItem('actorBusinessId');
};
export const isAuthed = () => !!localStorage.getItem("token");
export const getUserType = () => localStorage.getItem("userType") || 'victim';

// Add an axios response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect to /login if the request itself was a login attempt
      const requestUrl = error.config?.url || '';
      if (!requestUrl.includes('/login')) {
        clearToken();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Post-response handler: if backend returned a Firebase custom token in data.data.token,
// exchange it for an ID token automatically so the stored token is verifiable by backend.
api.interceptors.response.use(async (response) => {
  try {
    const maybeToken = response?.data?.data?.token;
    const requestUrl = response.config?.url || '';
    if (maybeToken && typeof maybeToken === 'string') {
      // Only auto-exchange for known auth endpoints to avoid surprising behavior
      if (requestUrl.includes('/login') || requestUrl.includes('/register') || requestUrl.includes('/anonymous/report')) {
        try {
          const idToken = await exchangeCustomTokenForIdToken(maybeToken);
          // Only save the token if exchange produced an ID token
          if (idToken && typeof idToken === 'string') {
            saveToken(idToken);
            console.debug('Token exchange successful, saved Firebase ID token (truncated):', idToken.slice(0, 12));
          } else {
            console.warn('Token exchange returned no ID token; clearing any existing token.');
            clearToken();
          }
        } catch (ex) {
          // Exchange failed — do NOT save the server custom token because server custom tokens are not
          // accepted by Firebase Admin's verifyIdToken. Clear tokens and surface a clear warning.
          console.warn('Auto token exchange failed:', ex);
          clearToken();
          // Show a visible error message to help devs/users diagnose the issue
          try {
            message.error('Authentication failed: unable to exchange server token. Ensure Firebase client config (VITE_FIREBASE_*) is set in the frontend and restart the dev server.');
          } catch (mErr) {
            console.warn('Unable to show UI message:', mErr);
          }
          // Developers: ensure VITE_FIREBASE_* client config is set and correct so exchange can succeed.
          console.warn('Token exchange failed. Ensure Firebase client config (VITE_FIREBASE_*) is available to the frontend.');
        }
      }
    }
  } catch (e) {
    console.warn('Error in post-response token handler', e);
  }
  return response;
}, (error) => {
  if (error.response?.status === 401) {
    const requestUrl = error.config?.url || '';
    if (!requestUrl.includes('/login')) {
      clearToken();
      window.location.href = '/';
    }
  }
  return Promise.reject(error);
});