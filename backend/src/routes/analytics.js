const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/analytics/summary - Get aggregate dashboard metrics
router.get('/summary', async (req, res) => {
  try {
    const summaryRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM campaigns) as total_campaigns,
        (SELECT COUNT(*) FROM contacts WHERE status != 'queued') as total_processed,
        (SELECT COUNT(*) FROM contacts WHERE status = 'sent') as total_sent,
        (SELECT COUNT(*) FROM contacts WHERE status = 'failed') as total_failed
    `);
    
    const summary = summaryRes.rows[0];
    
    // Ensure all numeric values are formatted as integers
    return res.json({
      total_campaigns: parseInt(summary.total_campaigns || 0, 10),
      total_processed: parseInt(summary.total_processed || 0, 10),
      total_sent: parseInt(summary.total_sent || 0, 10),
      total_failed: parseInt(summary.total_failed || 0, 10),
    });
  } catch (err) {
    console.error('Error fetching analytics summary:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics summary data.' });
  }
});

// GET /api/analytics/delivery-timeline - Get successful/failed counts aggregated by date
router.get('/delivery-timeline', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    let dateFilter = '';
    
    if (range === '7d') {
      dateFilter = "AND sent_at >= now() - interval '7 days'";
    } else if (range === '30d') {
      dateFilter = "AND sent_at >= now() - interval '30 days'";
    }
    
    const timelineRes = await pool.query(`
      SELECT 
        DATE_TRUNC('day', sent_at) as date,
        COUNT(*) FILTER (WHERE status = 'sent') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM contacts
      WHERE sent_at IS NOT NULL ${dateFilter}
      GROUP BY DATE_TRUNC('day', sent_at)
      ORDER BY date ASC
    `);

    // Format dates for line charts (e.g. YYYY-MM-DD)
    const formattedTimeline = timelineRes.rows.map(row => ({
      date: new Date(row.date).toISOString().split('T')[0],
      successful: parseInt(row.successful || 0, 10),
      failed: parseInt(row.failed || 0, 10),
    }));

    return res.json(formattedTimeline);
  } catch (err) {
    console.error('Error fetching delivery timeline:', err);
    return res.status(500).json({ error: 'Failed to fetch delivery timeline series.' });
  }
});

// GET /api/analytics/best-time - Get message success rate grouped by hour of the day
router.get('/best-time', async (req, res) => {
  try {
    const bestTimeRes = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM sent_at) as hour,
        COUNT(*) as sample_size,
        COUNT(*) FILTER (WHERE status = 'sent') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        ROUND(COUNT(*) FILTER (WHERE status = 'sent')::numeric / COUNT(*) * 100, 2) as success_rate
      FROM contacts
      WHERE sent_at IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM sent_at)
      ORDER BY hour ASC
    `);

    const formattedBestTime = bestTimeRes.rows.map(row => ({
      hour: parseInt(row.hour, 10),
      sample_size: parseInt(row.sample_size || 0, 10),
      successful: parseInt(row.successful || 0, 10),
      failed: parseInt(row.failed || 0, 10),
      success_rate: parseFloat(row.success_rate || 0),
    }));

    return res.json(formattedBestTime);
  } catch (err) {
    console.error('Error fetching best sending time analysis:', err);
    return res.status(500).json({ error: 'Failed to fetch best sending time metrics.' });
  }
});

// GET /api/analytics/comparison - Get campaign comparison grid metrics
router.get('/comparison', async (req, res) => {
  try {
    const comparisonRes = await pool.query(`
      SELECT 
        c.id,
        c.name,
        c.status,
        c.created_at,
        COUNT(con.id) as total_contacts,
        COUNT(con.id) FILTER (WHERE con.status = 'sent') as successful,
        COUNT(con.id) FILTER (WHERE con.status = 'failed') as failed,
        ROUND(COUNT(con.id) FILTER (WHERE con.status = 'sent')::numeric / NULLIF(COUNT(con.id), 0) * 100, 2) as success_rate
      FROM campaigns c
      LEFT JOIN contacts con ON con.campaign_id = c.id
      GROUP BY c.id, c.name, c.status, c.created_at
      ORDER BY c.created_at DESC
    `);

    const formattedComparison = comparisonRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      created_at: row.created_at,
      total_contacts: parseInt(row.total_contacts || 0, 10),
      successful: parseInt(row.successful || 0, 10),
      failed: parseInt(row.failed || 0, 10),
      success_rate: parseFloat(row.success_rate || 0),
    }));

    return res.json(formattedComparison);
  } catch (err) {
    console.error('Error fetching campaign comparison list:', err);
    return res.status(500).json({ error: 'Failed to fetch campaign comparison metrics.' });
  }
});

// GET /api/analytics/wow-trends - Get week-over-week growth metrics
router.get('/wow-trends', async (req, res) => {
  try {
    const currentWeekRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as successful
      FROM contacts
      WHERE sent_at >= now() - interval '7 days'
    `);
    
    const prevWeekRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as successful
      FROM contacts
      WHERE sent_at >= now() - interval '14 days' 
        AND sent_at < now() - interval '7 days'
    `);

    const current = currentWeekRes.rows[0];
    const previous = prevWeekRes.rows[0];

    const currentTotal = parseInt(current.total || 0, 10);
    const prevTotal = parseInt(previous.total || 0, 10);
    const currentSuccess = parseInt(current.successful || 0, 10);
    const prevSuccess = parseInt(previous.successful || 0, 10);

    const currentSuccessRate = currentTotal > 0 ? (currentSuccess / currentTotal) * 100 : 0;
    const prevSuccessRate = prevTotal > 0 ? (prevSuccess / prevTotal) * 100 : 0;

    // Calculate volume growth percentage
    let volumeGrowth = 0;
    if (prevTotal > 0) {
      volumeGrowth = ((currentTotal - prevTotal) / prevTotal) * 100;
    } else if (currentTotal > 0) {
      volumeGrowth = 100; // 100% growth if starting from 0
    }

    // Success rate variance
    const rateVariance = currentSuccessRate - prevSuccessRate;

    return res.json({
      current_week_volume: currentTotal,
      prev_week_volume: prevTotal,
      current_week_success_rate: parseFloat(currentSuccessRate.toFixed(2)),
      prev_week_success_rate: parseFloat(prevSuccessRate.toFixed(2)),
      volume_growth_percentage: parseFloat(volumeGrowth.toFixed(2)),
      success_rate_variance: parseFloat(rateVariance.toFixed(2)),
    });

  } catch (err) {
    console.error('Error fetching week-over-week trends:', err);
    return res.status(500).json({ error: 'Failed to fetch week-over-week trend insights.' });
  }
});

module.exports = router;
