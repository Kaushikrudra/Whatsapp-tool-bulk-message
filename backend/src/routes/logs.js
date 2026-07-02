const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/logs - Fetch last 100 logs across all campaigns including connection system events
router.get('/', async (req, res) => {
  try {
    const queryText = `
      SELECT 
        l.*,
        c.name as campaign_name
      FROM campaign_logs l
      LEFT JOIN campaigns c ON l.campaign_id = c.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `;
    const result = await pool.query(queryText);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).json({ error: 'Failed to retrieve system logs.' });
  }
});

module.exports = router;
