const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// GET /api/chats/conversations - Fetch distinct conversations with names, unread counts & latest messages
router.get('/conversations', async (req, res) => {
  try {
    const queryText = `
      WITH latest_messages AS (
        SELECT DISTINCT ON (phone_number)
          phone_number,
          message_text,
          direction,
          timestamp,
          is_read
        FROM messages
        ORDER BY phone_number, timestamp DESC
      ),
      unread_counts AS (
        SELECT
          phone_number,
          COUNT(*) FILTER (WHERE direction = 'incoming' AND is_read = false) as unread_count
        FROM messages
        GROUP BY phone_number
      )
      SELECT
        lm.phone_number,
        lm.message_text as last_message,
        lm.direction as last_message_direction,
        lm.timestamp as last_message_time,
        COALESCE(uc.unread_count, 0)::int as unread_count,
        COALESCE(c.name, lm.phone_number) as contact_name
      FROM latest_messages lm
      LEFT JOIN unread_counts uc ON lm.phone_number = uc.phone_number
      LEFT JOIN (
        SELECT DISTINCT ON (phone_number) phone_number, name
        FROM contacts
        ORDER BY phone_number, id DESC
      ) c ON lm.phone_number = c.phone_number
      ORDER BY lm.timestamp DESC;
    `;
    const result = await pool.query(queryText);
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversations.' });
  }
});

// GET /api/chats/conversations/:phoneNumber/messages - Fetch chronological message history
router.get('/conversations/:phoneNumber/messages', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const result = await pool.query(
      'SELECT * FROM messages WHERE phone_number = $1 ORDER BY timestamp ASC',
      [phoneNumber]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return res.status(500).json({ error: 'Failed to retrieve chat history.' });
  }
});

// POST /api/chats/conversations/:phoneNumber/send - Send a manual reply via WhatsApp & save to DB
router.post('/conversations/:phoneNumber/send', async (req, res) => {
  const { phoneNumber } = req.params;
  const { messageText } = req.body;

  if (!messageText || !messageText.trim()) {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  try {
    const { sendTextMessage } = require('../whatsapp/connection');
    const recipientJid = `${phoneNumber}@s.whatsapp.net`;
    
    // Send via active WhatsApp socket
    await sendTextMessage(recipientJid, messageText.trim());

    // Save outgoing message to database
    const result = await pool.query(
      "INSERT INTO messages (phone_number, direction, message_text, is_read, timestamp) VALUES ($1, 'outgoing', $2, true, now()) RETURNING *",
      [phoneNumber, messageText.trim()]
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error sending manual reply:', error);
    return res.status(500).json({ error: `Failed to send reply: ${error.message}` });
  }
});

// PATCH /api/chats/conversations/:phoneNumber/read - Mark all incoming messages from this number as read
router.patch('/conversations/:phoneNumber/read', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    await pool.query(
      "UPDATE messages SET is_read = true WHERE phone_number = $1 AND direction = 'incoming' AND is_read = false",
      [phoneNumber]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

module.exports = router;
