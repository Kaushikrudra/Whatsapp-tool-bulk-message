const express = require('express');
const router = express.Router();
const {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/templatesController');

// POST /api/templates - Create a new template
router.post('/', createTemplate);

// GET /api/templates - Get all templates
router.get('/', getTemplates);

// GET /api/templates/:id - Get a single template by id
router.get('/:id', getTemplateById);

// PUT /api/templates/:id - Update an existing template
router.put('/:id', updateTemplate);

// DELETE /api/templates/:id - Delete a template by id
router.delete('/:id', deleteTemplate);

module.exports = router;
