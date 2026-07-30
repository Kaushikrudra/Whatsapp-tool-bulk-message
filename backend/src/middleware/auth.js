const supabase = require('../config/supabaseClient');
const { pool } = require('../config/db');

const ADMIN_EMAIL = (process.env.DASHBOARD_USER || 'kaushikrudra610@gmail.com').toLowerCase();

/**
 * Ensures user exists in PostgreSQL users table and updates expired subscription status if needed.
 */
async function syncUserInDb(authUser) {
  if (!authUser || !authUser.id) return null;
  const email = authUser.email || `${authUser.id}@supabase.user`;
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL || email.toLowerCase() === 'admin@bulkchat.com' || authUser.id === 'admin';
  
  try {
    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [authUser.id]);
    if (existing.rows.length === 0) {
      const initialStatus = isAdmin ? 'active' : 'inactive';
      const inserted = await pool.query(
        `INSERT INTO users (id, email, subscription_status, plan_expiry) VALUES ($1, $2, $3, $4) RETURNING *`,
        [authUser.id, email, initialStatus, isAdmin ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : null]
      );
      return inserted.rows[0];
    }
    
    let dbUser = existing.rows[0];
    
    // Admin gets permanent active subscription
    if (isAdmin) {
      if (dbUser.subscription_status !== 'active') {
        const updated = await pool.query(
          `UPDATE users SET subscription_status = 'active', plan_expiry = NOW() + INTERVAL '10 years', updated_at = NOW() WHERE id = $1 RETURNING *`,
          [authUser.id]
        );
        dbUser = updated.rows[0];
      }
      return dbUser;
    }
    
    // Check if regular user subscription has expired
    if (dbUser.subscription_status === 'active' && dbUser.plan_expiry && new Date(dbUser.plan_expiry) < new Date()) {
      const updated = await pool.query(
        `UPDATE users SET subscription_status = 'expired', updated_at = NOW() WHERE id = $1 RETURNING *`,
        [authUser.id]
      );
      dbUser = updated.rows[0];
    }
    
    return dbUser;
  } catch (err) {
    console.error('Error syncing user in DB:', err);
    return {
      id: authUser.id,
      email: email,
      subscription_status: isAdmin ? 'active' : 'inactive',
      plan_expiry: isAdmin ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : null,
    };
  }
}

/**
 * Authentication Middleware.
 * Supports legacy admin login and Supabase Auth JWT tokens.
 */
const authMiddleware = async (req, res, next) => {
  const path = req.path;
  const originalUrl = req.originalUrl;

  // Public endpoints bypass authentication
  if (
    path === '/auth/login' ||
    path === '/auth/signup' ||
    path === '/status' ||
    path === '/subscription/config' ||
    originalUrl === '/api/auth/login' ||
    originalUrl === '/api/auth/signup' ||
    originalUrl === '/api/status' ||
    originalUrl === '/api/subscription/config'
  ) {
    return next();
  }

  // Check legacy admin signed cookie session
  if (req.signedCookies && req.signedCookies.auth_session === 'admin_logged_in') {
    req.user = {
      id: 'admin',
      email: ADMIN_EMAIL,
      subscription_status: 'active',
      plan_expiry: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
    };
    return next();
  }

  // Check Authorization token header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    
    // Legacy admin token
    if (token === 'admin_logged_in') {
      req.user = {
        id: 'admin',
        email: ADMIN_EMAIL,
        subscription_status: 'active',
        plan_expiry: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
      };
      return next();
    }

    // Verify Supabase Auth token
    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data && data.user) {
          const dbUser = await syncUserInDb(data.user);
          req.user = dbUser || {
            id: data.user.id,
            email: data.user.email,
            subscription_status: (data.user.email && data.user.email.toLowerCase() === ADMIN_EMAIL) ? 'active' : 'inactive',
            plan_expiry: (data.user.email && data.user.email.toLowerCase() === ADMIN_EMAIL) ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000) : null
          };
          return next();
        }
      } catch (err) {
        console.error('JWT authentication error:', err.message);
      }
    }
  }

  // Not authenticated
  return res.status(401).json({ error: 'Unauthorized. Please login first.' });
};

module.exports = authMiddleware;
module.exports.syncUserInDb = syncUserInDb;

