const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../config/db');

// GET /api/subscription/config - Returns public Razorpay Key ID
router.get('/config', (req, res) => {
  res.json({
    key_id: process.env.RAZORPAY_KEY_ID || ''
  });
});

// POST /api/subscription/create-order - Create Razorpay payment order for ₹2999/month Pro plan
router.post('/create-order', async (req, res) => {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return res.status(500).json({ 
        error: 'Razorpay keys not configured', 
        message: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables.' 
      });
    }

    const instance = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });

    const options = {
      amount: 299900, // ₹2999.00 in paise
      currency: 'INR',
      receipt: `pixel_sub_${Date.now()}`,
      notes: {
        plan: 'Pro',
        user_id: req.user ? req.user.id : 'unknown'
      }
    };

    const order = await instance.orders.create(options);
    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: key_id
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({ error: 'Failed to create payment order', details: error.message });
  }
});

// POST /api/subscription/verify-payment - Verify Razorpay payment signature & activate subscription
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret) {
      return res.status(500).json({ error: 'RAZORPAY_KEY_SECRET missing in server environment' });
    }

    // Verify signature using HMAC-SHA256
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
    const expectedSignature = hmac.digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
    }

    // Payment signature is valid! Calculate plan expiry = NOW + 30 days
    const planExpiry = new Date();
    planExpiry.setDate(planExpiry.getDate() + 30);

    if (userId) {
      await pool.query(
        `UPDATE users 
         SET subscription_status = 'active', 
             plan_expiry = $1, 
             razorpay_payment_id = $2, 
             razorpay_order_id = $3, 
             updated_at = NOW() 
         WHERE id = $4`,
        [planExpiry, razorpay_payment_id, razorpay_order_id, userId]
      );
    }

    return res.json({
      success: true,
      subscription_status: 'active',
      plan_expiry: planExpiry,
      message: 'Subscription successfully activated for 30 days!'
    });
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return res.status(500).json({ error: 'Payment verification failed', details: error.message });
  }
});

module.exports = router;
