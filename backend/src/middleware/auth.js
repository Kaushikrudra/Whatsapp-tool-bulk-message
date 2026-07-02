/**
 * Authentication Middleware for password protection.
 * Checks for a valid signed cookie session or Authorization token.
 */
const authMiddleware = (req, res, next) => {
  const path = req.path;
  const originalUrl = req.originalUrl;

  // Bypass authentication check for login and connection status endpoints
  if (
    path === '/auth/login' ||
    path === '/status' ||
    originalUrl === '/api/auth/login' ||
    originalUrl === '/api/status'
  ) {
    return next();
  }

  // Check signed cookie session value
  if (req.signedCookies && req.signedCookies.auth_session === 'admin_logged_in') {
    return next();
  }

  // Check Authorization token header (Bearer style)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader === 'Bearer admin_logged_in') {
    return next();
  }

  // Not authenticated
  return res.status(401).json({ error: 'Unauthorized. Please login first.' });
};

module.exports = authMiddleware;
