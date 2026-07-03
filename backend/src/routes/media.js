const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadMedia } = require('../controllers/mediaController');

// Configure Multer storage to handle file uploads in-memory (up to 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // Limit to 50MB
  }
});

// POST /api/media/upload
router.post('/upload', upload.single('file'), uploadMedia);

module.exports = router;
