const express = require('express');
const router = express.Router();
const multer = require('multer');
const { pool } = require('../config/db');
const { handleContactUpload } = require('../controllers/contactsController');

// Multer memory-storage setup to process uploads without saving files to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
});

// POST /api/contacts/upload - Upload and parse contact list file
router.post('/upload', upload.single('file'), handleContactUpload);

// GET /api/contacts/lists - Get all lists ordered by creation date
router.get('/lists', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact_lists ORDER BY created_at DESC');
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contact lists:', error);
    return res.status(500).json({ error: 'Failed to retrieve contact lists' });
  }
});

// GET /api/contacts/lists/:id - Get specific list and paginated contacts
router.get('/lists/:id', async (req, res) => {
  try {
    const listId = req.params.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    // Check if the contact list exists
    const listResult = await pool.query('SELECT * FROM contact_lists WHERE id = $1', [listId]);
    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contact list not found' });
    }

    // Get total count of valid unique contacts in this list
    const countResult = await pool.query('SELECT COUNT(*) FROM contacts WHERE list_id = $1', [listId]);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated contacts
    const contactsResult = await pool.query(
      'SELECT * FROM contacts WHERE list_id = $1 ORDER BY id ASC LIMIT $2 OFFSET $3',
      [listId, limit, offset]
    );

    return res.json({
      list: listResult.rows[0],
      contacts: contactsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching paginated contacts:', error);
    return res.status(500).json({ error: 'Failed to retrieve contacts list details' });
  }
});

// DELETE /api/contacts/lists/:id - Delete list and all associated contacts
router.delete('/lists/:id', async (req, res) => {
  try {
    const listId = req.params.id;
    
    // Delete the contact list (associated contacts will be cascade-deleted by foreign key constraint)
    const result = await pool.query('DELETE FROM contact_lists WHERE id = $1 RETURNING *', [listId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact list not found' });
    }

    return res.json({
      success: true,
      message: 'Contact list and all associated contacts deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting contact list:', error);
    return res.status(500).json({ error: 'Failed to delete contact list' });
  }
});

module.exports = router;
