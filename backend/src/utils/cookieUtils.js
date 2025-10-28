/**
 * Utility functions for handling HTTP-only cookie operations
 * Prevents XSS attacks by ensuring tokens are never accessible to JavaScript
 */

/**
 * Set secure HTTP-only cookie with the authentication token
 * @param {Object} res - Express response object
 * @param {string} token - The authentication token to store
 * @param {Object} options - Additional cookie options
 */
const setAuthCookie = (res, token, options = {}) => {
  const defaultOptions = {
    httpOnly: true,  // Prevents JavaScript access (XSS protection)
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    sameSite: 'lax',  // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    path: '/'
  };

  const cookieOptions = { ...defaultOptions, ...options };

  res.cookie('authToken', token, cookieOptions);
};

/**
 * Clear the authentication cookie
 * @param {Object} res - Express response object
 */
const clearAuthCookie = (res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
};

/**
 * Get token from request (from cookies)
 * @param {Object} req - Express request object
 * @returns {string|null} The authentication token or null if not found
 */
const getTokenFromRequest = (req) => {
  // Check cookies first (HTTP-only cookies)
  if (req.cookies && req.cookies.authToken) {
    return req.cookies.authToken;
  }
  
  // Fallback to Authorization header for compatibility
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  
  return null;
};

/**
 * Set user data in a secure, HttpOnly cookie
 * User data should NEVER be accessible to JavaScript to prevent data leaks
 * @param {Object} res - Express response object
 * @param {Object} userData - User information object
 */
const setUserDataCookie = (res, userData) => {
  const userDataJson = JSON.stringify(userData);
  
  const cookieOptions = {
    httpOnly: true,  // ✅ User data is also HTTP-only (NOT accessible to JS)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    path: '/'
  };
  
  res.cookie('userData', userDataJson, cookieOptions);
};

/**
 * Clear user data cookie
 * @param {Object} res - Express response object
 */
const clearUserDataCookie = (res) => {
  res.clearCookie('userData', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
};

/**
 * Get user data from cookies
 * @param {Object} req - Express request object
 * @returns {Object|null} The user data or null if not found
 */
const getUserDataFromCookie = (req) => {
  try {
    if (req.cookies && req.cookies.userData) {
      const userData = JSON.parse(req.cookies.userData);
      return userData;
    }
  } catch (e) {
    console.debug('[cookieUtils] Failed to parse user data:', e.message);
  }
  return null;
};

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
  setUserDataCookie,
  clearUserDataCookie,
  getUserDataFromCookie
};
