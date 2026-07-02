const { pool } = require('../config/db');

/**
 * Creates a new message template.
 * POST /api/templates
 */
async function createTemplate(req, res) {
  try {
    const { name, body } = req.body;

    // Validation: name and body must be present and non-empty
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Template body is required.' });
    }

    const result = await pool.query(
      `INSERT INTO templates (name, body, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       RETURNING *`,
      [name.trim(), body.trim()]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating template:', error);
    return res.status(500).json({ error: 'Failed to create message template.' });
  }
}

/**
 * Retrieves all templates, sorted by the most recently updated first.
 * GET /api/templates
 */
async function getTemplates(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM templates ORDER BY updated_at DESC'
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return res.status(500).json({ error: 'Failed to retrieve message templates.' });
  }
}

/**
 * Retrieves a single template by ID.
 * GET /api/templates/:id
 */
async function getTemplateById(req, res) {
  try {
    const templateId = req.params.id;
    const result = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching template by id:', error);
    return res.status(500).json({ error: 'Failed to retrieve message template details.' });
  }
}

/**
 * Updates an existing template's name, body, and updated_at timestamp.
 * PUT /api/templates/:id
 */
async function updateTemplate(req, res) {
  try {
    const templateId = req.params.id;
    const { name, body } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required.' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Template body is required.' });
    }

    const result = await pool.query(
      `UPDATE templates
       SET name = $1, body = $2, updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [name.trim(), body.trim(), templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ error: 'Failed to update message template.' });
  }
}

/**
 * Deletes a template by ID.
 * DELETE /api/templates/:id
 */
async function deleteTemplate(req, res) {
  try {
    const templateId = req.params.id;
    const result = await pool.query(
      'DELETE FROM templates WHERE id = $1 RETURNING *',
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    return res.json({
      success: true,
      message: 'Template deleted successfully.',
      deletedTemplate: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ error: 'Failed to delete message template.' });
  }
}

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
};
