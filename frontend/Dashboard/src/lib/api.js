// src/lib/api.js
import axios from "axios";
import { message } from 'antd';
import { exchangeCustomTokenForIdToken, initFirebase } from './firebase';
import { getAuth } from 'firebase/auth';

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL,
  withCredentials: true,  // Enable sending cookies with requests (CRITICAL!)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Log API configuration for debugging
console.log('[api] Initialized with config:', {
  baseURL,
  withCredentials: true,
  environment: import.meta.env.MODE
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Token is now sent automatically via HTTP-only cookies with withCredentials: true
    // Attach actor information from sessionStorage so backend can persist actorBusinessId
    try {
      const actorBusinessId = sessionStorage.getItem('actorBusinessId');
      const actorId = sessionStorage.getItem('actorId');
      const actorType = sessionStorage.getItem('actorType');
      if (actorBusinessId) config.headers['x-actor-business-id'] = actorBusinessId;
      if (actorId) config.headers['x-actor-id'] = actorId;
      if (actorType) config.headers['x-actor-type'] = actorType;
    } catch (e) {
      // ignore sessionStorage errors (e.g., during SSR or restricted environments)
    }
    try {
      // Debug: log outgoing requests for easier tracing (including method and url)
      console.debug('[api] outgoing request', { method: config.method, url: config.baseURL ? `${config.baseURL}${config.url}` : config.url, withCredentials: config.withCredentials });
    } catch (e) {
      console.debug('[api] failed to log request', e && e.message);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const saveToken = (t) => {
  // Token is now stored in HTTP-only cookies by the backend
  // We no longer need to store it in sessionStorage for security reasons (XSS prevention)
  console.debug('[api] Token received and stored in HTTP-only cookie by backend');
};

export const clearToken = () => {
  // Remove all authentication and actor-related keys from sessionStorage
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
  sessionStorage.removeItem("userType");
  sessionStorage.removeItem('actorId');
  sessionStorage.removeItem('actorType');
  sessionStorage.removeItem('actorBusinessId');
  
  // HTTP-only cookies are cleared by the backend on logout via Set-Cookie header
  console.debug('[api] Cleared auth data from sessionStorage');
};

/**
 * Cache for user data to avoid repeated API calls
 */
let userDataCache = null;
let userDataCacheExpiry = 0;

/**
 * Clear user data cache
 */
export const clearUserDataCache = () => {
  userDataCache = null;
  userDataCacheExpiry = 0;
};

export const clearAllStorage = () => {
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Clear localStorage
  localStorage.clear();
  
  // Clear user data cache
  clearUserDataCache();
  
  // Clear all cookies with multiple strategies to ensure complete removal
  const clearCookie = (name) => {
    // Strategy 1: No domain specified
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;`;
    
    // Strategy 2: With domain specified
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; SameSite=Lax;`;
    
    // Strategy 3: With root domain (if applicable)
    const parts = window.location.hostname.split('.');
    if (parts.length > 1) {
      const rootDomain = parts.slice(-2).join('.');
      if (rootDomain !== window.location.hostname) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${rootDomain}; SameSite=Lax;`;
      }
    }
  };

  // Get all cookies and clear them
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
    if (name) {
      clearCookie(name);
    }
  });
  
  // Also explicitly clear known auth cookies
  ['token', 'auth_token', 'authToken', 'Authorization', 'session', 'sessionId', 'userData'].forEach(clearCookie);
};

/**
 * Get user data from secure backend endpoint
 * Since user data is in HTTP-only cookie, we must fetch it from backend
 * @returns {Promise<Object|null>} User data or null if not authenticated
 */
export const getUserData = async () => {
  // Return cached data if still valid (cache for 5 minutes)
  if (userDataCache && Date.now() < userDataCacheExpiry) {
    return userDataCache;
  }

  try {
    const response = await api.get('/api/auth/user-data');
    if (response.data?.success && response.data?.userData) {
      userDataCache = response.data.userData;
      userDataCacheExpiry = Date.now() + (5 * 60 * 1000); // 5 minute cache
      return userDataCache;
    }
  } catch (error) {
    console.debug('[api] Could not fetch user data:', error.message);
  }
  return null;
};

export const isAuthed = () => {
  // Check if userType exists in sessionStorage as indicator of authentication
  // The actual auth token and user data are in HTTP-only cookies
  return !!sessionStorage.getItem("userType");
};


export const getUserType = async () => {
  const userType = sessionStorage.getItem("userType");
  if (!userType) return null;

  try {
    const response = await api.get("api/auth/me");
    // ✅ match backend: response.data.user.role
    return response.data?.user?.role || null;
  } catch (error) {
    console.warn("[api] Failed to fetch user type:", error);
    return null;
  }
};

api.interceptors.response.use(
  (response) => {
    // Token is now in HTTP-only cookie, no need to handle it in response
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    if (status === 401) {
      // Only force logout for critical auth verification endpoints
      if (requestUrl.includes('/token/refresh') || requestUrl.includes('/auth/me')) {
        console.log('[api] auth failure on critical endpoint — clearing session and redirecting to login');
        clearToken();
        // if user is in admin area, redirect to admin login; otherwise redirect to regular login
        const redirectToAdmin = window.location.pathname.startsWith('/admin');
        window.location.href = redirectToAdmin ? '/admin/login' : '/login';
      } else {
        // Let the caller handle failed login attempts and other 401s
        console.warn('[api] 401 received for', requestUrl, '- delegating to caller (no auto-logout).');
      }
    }

    return Promise.reject(error);
  }
);

export default api;