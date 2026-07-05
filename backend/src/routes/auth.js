const express = require('express');
const router = express.Router();

// POST /api/auth/login - Authenticate user credentials and create signed cookie session
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = process.env.DASHBOARD_USER || 'admin';
  const pass = process.env.DASHBOARD_PASS || 'admin123';

  if (username === user && password === pass) {
    // Generate signed, secure, HTTP-only cookie valid for 1 day
    res.cookie('auth_session', 'admin_logged_in', {
      signed: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: 'none',
    });
    return res.json({ success: true, token: 'admin_logged_in' });
  } else {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
});

// POST /api/auth/logout - Clear user session signed cookie
router.post('/logout', (req, res) => {
  res.clearCookie('auth_session');
  return res.json({ success: true });
});

module.exports = router;
