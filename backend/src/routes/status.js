const express = require('express');
const router = express.Router();
const { getConnectionStatus, getQRCode, logoutWhatsApp } = require('../whatsapp/connection');

// GET /api/status - Returns connection status and QR code base64 if not connected
router.get('/status', (req, res) => {
  const status = getConnectionStatus();
  const qr = status !== 'connected' ? getQRCode() : null;
  
  res.json({
    status,
    qr,
  });
});

// POST /api/logout - Log out of WhatsApp, clear credentials, reset connection status
router.post('/logout', async (req, res) => {
  try {
    await logoutWhatsApp();
    res.json({ success: true });
  } catch (error) {
    console.error('Error during logout route execution:', error);
    res.status(500).json({ success: false, error: 'Failed to log out' });
  }
});

module.exports = router;
