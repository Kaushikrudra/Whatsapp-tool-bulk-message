const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/bot-rules - Fetch all keyword auto-reply rules
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bot_rules ORDER BY keyword ASC');
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bot rules:', error);
    return res.status(500).json({ error: 'Failed to retrieve bot rules.' });
  }
});

// POST /api/bot-rules - Create a new keyword rule
router.post('/', async (req, res) => {
  const { keyword, response_text, match_type } = req.body;

  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ error: 'Keyword is required.' });
  }
  if (!response_text || !response_text.trim()) {
    return res.status(400).json({ error: 'Response text is required.' });
  }

  const cleanKeyword = keyword.trim().toLowerCase();
  const cleanMatch = match_type === 'exact' ? 'exact' : 'contains';

  try {
    // Check if keyword already exists
    const checkRes = await pool.query('SELECT id FROM bot_rules WHERE keyword = $1', [cleanKeyword]);
    if (checkRes.rows.length > 0) {
      return res.status(400).json({ error: 'A rule for this keyword already exists.' });
    }

    const result = await pool.query(
      'INSERT INTO bot_rules (keyword, response_text, match_type, is_active) VALUES ($1, $2, $3, true) RETURNING *',
      [cleanKeyword, response_text.trim(), cleanMatch]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating bot rule:', error);
    return res.status(500).json({ error: 'Failed to create bot rule.' });
  }
});

// PUT /api/bot-rules/:id - Update an existing rule
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { keyword, response_text, match_type, is_active } = req.body;

  try {
    const checkRes = await pool.query('SELECT * FROM bot_rules WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Bot rule not found.' });
    }

    const updates = {};
    const values = [];
    let queryIndex = 1;

    if (keyword !== undefined && keyword.trim()) {
      const cleanKeyword = keyword.trim().toLowerCase();
      // Ensure keyword unique constraint
      const dupCheck = await pool.query('SELECT id FROM bot_rules WHERE keyword = $1 AND id <> $2', [cleanKeyword, id]);
      if (dupCheck.rows.length > 0) {
        return res.status(400).json({ error: 'A rule for this keyword already exists.' });
      }
      updates.keyword = cleanKeyword;
      values.push(cleanKeyword);
    }

    if (response_text !== undefined && response_text.trim()) {
      updates.response_text = response_text.trim();
      values.push(response_text.trim());
    }

    if (match_type !== undefined) {
      const cleanMatch = match_type === 'exact' ? 'exact' : 'contains';
      updates.match_type = cleanMatch;
      values.push(cleanMatch);
    }

    if (is_active !== undefined) {
      updates.is_active = !!is_active;
      values.push(!!is_active);
    }

    if (values.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    // Dynamically build update query
    let setClause = '';
    const keys = Object.keys(updates);
    for (let i = 0; i < keys.length; i++) {
      setClause += `${keys[i]} = $${i + 1}${i < keys.length - 1 ? ', ' : ''}`;
    }

    values.push(id);
    const updateQuery = `UPDATE bot_rules SET ${setClause} WHERE id = $${values.length} RETURNING *`;
    const result = await pool.query(updateQuery, values);

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating bot rule:', error);
    return res.status(500).json({ error: 'Failed to update bot rule.' });
  }
});

// DELETE /api/bot-rules/:id - Remove a rule
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const checkRes = await pool.query('SELECT id FROM bot_rules WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Bot rule not found.' });
    }

    await pool.query('DELETE FROM bot_rules WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Bot rule deleted successfully.' });
  } catch (error) {
    console.error('Error deleting bot rule:', error);
    return res.status(500).json({ error: 'Failed to delete bot rule.' });
  }
});

module.exports = router;
