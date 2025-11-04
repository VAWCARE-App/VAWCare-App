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

export const clearAllStorage = async () => {
  // Clear user data cache
  clearUserDataCache();

  // Call backend logout endpoint to clear HTTP-only cookies
  // HTTP-only cookies cannot be accessed by JavaScript, so we must use the backend endpoint
  try {
    await api.post('/api/auth/logout', {
      // Include actor info if available (best-effort)
      actorId: sessionStorage.getItem('actorId'),
      actorType: sessionStorage.getItem('actorType'),
      actorBusinessId: sessionStorage.getItem('actorBusinessId'),
    });
  } catch (err) {
    console.warn('Backend logout call failed:', err?.message);
    // Continue clearing frontend storage even if backend call fails
  }

  // Clear sessionStorage (must be after backend call in case it's needed)
  sessionStorage.clear();

  // Clear localStorage
  localStorage.clear();

  // Clear any regular (non-HttpOnly) cookies
  // Note: HTTP-only cookies CANNOT be cleared by JavaScript - only the backend can via the logout endpoint above
  const clearCookie = (name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;`;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}; SameSite=Lax;`;
  };

  // Clear any remaining non-HttpOnly cookies
  ['token', 'auth_token', 'Authorization', 'session', 'sessionId'].forEach(clearCookie);
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
      const authCheck =
        requestUrl.includes('api/auth/me') ||
        requestUrl.includes('api/token/refresh');

      if (authCheck) {
        console.warn('[api] 401 on auth check → logout triggered:', requestUrl);
        clearToken();
        window.dispatchEvent(new CustomEvent('api:unauthorized'));
      } else {
        console.warn('[api] 401 for non-auth endpoint → no forced logout:', requestUrl);
      }
    }

    return Promise.reject(error);
  }
);

export default api;