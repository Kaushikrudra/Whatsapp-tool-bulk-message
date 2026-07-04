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

// GET /api/contacts/tags - Get all distinct tags currently in the database
router.get('/tags', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT unnest(tags) as tag FROM contacts WHERE tags IS NOT NULL ORDER BY tag ASC');
    const tags = result.rows.map(r => r.tag);
    return res.json(tags);
  } catch (error) {
    console.error('Error fetching distinct tags:', error);
    return res.status(500).json({ error: 'Failed to retrieve tags' });
  }
});

// PUT /api/contacts/:id/tags - Update tags for a specific contact
router.put('/:id/tags', async (req, res) => {
  try {
    const contactId = req.params.id;
    const { tags } = req.body; // Expects an array of strings, e.g. ["hot", "vip"]
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags parameter must be a string array' });
    }

    // Clean tags: trim, lowercase, remove duplicates/empty strings
    const cleanedTags = Array.from(new Set(
      tags.map(t => String(t).trim().toLowerCase()).filter(t => t.length > 0)
    ));

    const result = await pool.query(
      'UPDATE contacts SET tags = $1 WHERE id = $2 RETURNING *',
      [cleanedTags, contactId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contact tags:', error);
    return res.status(500).json({ error: 'Failed to update contact tags' });
  }
});

// GET /api/contacts - Global search & filter contacts (by tag or search term)
router.get('/', async (req, res) => {
  try {
    const { tag, search, page = 1 } = req.query;
    const limit = 50;
    const offset = (page - 1) * limit;

    let queryText = 'SELECT * FROM contacts WHERE 1=1';
    let countQueryText = 'SELECT COUNT(*) FROM contacts WHERE 1=1';
    let queryValues = [];
    let countValues = [];
    let paramIndex = 1;

    if (tag) {
      queryText += ` AND $${paramIndex} = ANY(tags)`;
      countQueryText += ` AND $${paramIndex} = ANY(tags)`;
      queryValues.push(tag);
      countValues.push(tag);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (name ILIKE $${paramIndex} OR phone_number ILIKE $${paramIndex} OR company ILIKE $${paramIndex})`;
      countQueryText += ` AND (name ILIKE $${paramIndex} OR phone_number ILIKE $${paramIndex} OR company ILIKE $${paramIndex})`;
      queryValues.push(`%${search}%`);
      countValues.push(`%${search}%`);
      paramIndex++;
    }

    // Get total matches count
    const countRes = await pool.query(countQueryText, countValues);
    const total = parseInt(countRes.rows[0].count, 10);

    // Get paginated rows
    queryText += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryValues.push(limit, offset);
    
    const result = await pool.query(queryText, queryValues);

    return res.json({
      contacts: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    return res.status(500).json({ error: 'Failed to query contacts' });
  }
});

module.exports = router;
