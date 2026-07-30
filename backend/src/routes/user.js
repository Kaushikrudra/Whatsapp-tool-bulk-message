const express = require('express');
const router = express.Router();
const { getStatus } = require('../whatsapp/connection');

const ADMIN_EMAIL = (process.env.DASHBOARD_USER || 'kaushikrudra610@gmail.com').toLowerCase();

// GET /api/user/status - Return current authenticated user info, subscription status, and WhatsApp connection status
router.get('/status', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userEmail = (req.user.email || '').toLowerCase();
  const isAdmin = userEmail === ADMIN_EMAIL || userEmail === 'admin@bulkchat.com' || req.user.id === 'admin';

  const { status: whatsapp_status, qr } = getStatus();
  const isExpired = !isAdmin && req.user.plan_expiry && new Date(req.user.plan_expiry) < new Date();
  const effective_status = isAdmin ? 'active' : (isExpired ? 'expired' : (req.user.subscription_status || 'inactive'));

  return res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      is_admin: isAdmin,
    },
    subscription_status: effective_status,
    plan_expiry: req.user.plan_expiry,
    whatsapp_status: whatsapp_status,
    qr: qr
  });
});

module.exports = router;
