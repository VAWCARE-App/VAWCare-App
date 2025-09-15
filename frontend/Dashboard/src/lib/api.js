// src/lib/api.js
import axios from "axios";
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
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const saveToken = (t) => localStorage.setItem("token", t);
export const clearToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userType");
};
export const isAuthed = () => !!localStorage.getItem("token");
export const getUserType = () => localStorage.getItem("userType") || 'victim';

// Add an axios response interceptor to handle unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
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
          saveToken(idToken);
        } catch (ex) {
          // If exchange fails, fall back to saving server token (keeps previous behavior)
          console.warn('Auto token exchange failed:', ex);
          saveToken(maybeToken);
        }
      }
    }
  } catch (e) {
    console.warn('Error in post-response token handler', e);
  }
  return response;
}, (error) => {
  if (error.response?.status === 401) {
    clearToken();
    window.location.href = '/login';
  }
  return Promise.reject(error);
});