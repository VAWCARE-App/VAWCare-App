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
    // Attach actor information from localStorage so backend can persist actorBusinessId
    try {
      const actorBusinessId = localStorage.getItem('actorBusinessId');
      const actorId = localStorage.getItem('actorId');
      const actorType = localStorage.getItem('actorType');
      if (actorBusinessId) config.headers['x-actor-business-id'] = actorBusinessId;
      if (actorId) config.headers['x-actor-id'] = actorId;
      if (actorType) config.headers['x-actor-type'] = actorType;
    } catch (e) {
      // ignore localStorage errors (e.g., during SSR or restricted environments)
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
    // Previously we cleared tokens and redirected here. That caused immediate sign-out
    // when some protected endpoints returned 401 during development. Delegate handling
    // to the calling component so pages can retry or show friendly UI.
    if (error.response?.status === 401) {
      try {
        // Show a non-intrusive message; don't clear token or redirect here.
        const requestUrl = error.config?.url || '';
        console.warn(`[api] 401 response for ${requestUrl}`);
        // Optionally show a warning for visibility during dev
        // message.warning('Session invalid or expired. Please sign in again.');
      } catch (e) {
        console.debug('Failed to log 401 handling', e && e.message);
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
          // Exchange failed — don't forcibly clear the stored token here. Some development setups
          // don't have Firebase client config and we want the login flow to decide what to do.
          console.warn('Auto token exchange failed (non-fatal):', ex);
          // Show a visible warning to help devs/users diagnose the issue, but don't clear token.
          try {
            message.warning('Authentication token exchange failed. If protected requests fail, ensure Firebase client config (VITE_FIREBASE_*) is set.');
          } catch (mErr) {
            console.warn('Unable to show UI message:', mErr);
          }
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
    // Delegate 401 handling to the caller; do not mutate auth storage here to avoid
    // race conditions that cause components to redirect unexpectedly.
    console.warn('[api] intercepted 401 error (delegating to caller)');
  }
  return Promise.reject(error);
});