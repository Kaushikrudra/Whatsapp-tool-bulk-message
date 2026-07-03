const path = require('path');
const supabase = require('../config/supabaseClient');

/**
 * Ensures that the bucket 'media-attachments' exists and is configured as public.
 */
async function ensureBucketExists() {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('[Supabase Storage] Error listing buckets:', listError.message);
      return;
    }

    const bucketName = 'media-attachments';
    const exists = buckets.some(b => b.name === bucketName);

    if (!exists) {
      console.log(`[Supabase Storage] Bucket '${bucketName}' not found. Creating it...`);
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'video/mp4'],
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      });
      if (createError) {
        console.error('[Supabase Storage] Error creating bucket:', createError.message);
      } else {
        console.log(`[Supabase Storage] Bucket '${bucketName}' created successfully as a public bucket.`);
      }
    }
  } catch (err) {
    console.error('[Supabase Storage] Exception while checking bucket:', err.message);
  }
}

// Check / create bucket on module load
ensureBucketExists();

// Helper to determine media type from mime-type
function getMediaType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('video/')) return 'video';
  return 'none';
}

/**
 * Uploads a file buffer from multer memory storage to Supabase Storage.
 * Returns publicUrl, mediaType, and fileName.
 */
async function uploadMedia(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const file = req.file;
    const mediaType = getMediaType(file.mimetype);
    if (mediaType === 'none') {
      return res.status(400).json({ error: 'Unsupported file type. Only JPG/PNG images, PDF documents, and MP4 videos are allowed.' });
    }

    // Generate unique filename to prevent namespace collisions
    const fileExt = path.extname(file.originalname).toLowerCase() || (mediaType === 'pdf' ? '.pdf' : mediaType === 'video' ? '.mp4' : '.jpg');
    const fileName = `media_${Date.now()}_${Math.floor(Math.random() * 1000)}${fileExt}`;

    // Upload to 'media-attachments' bucket
    const { data, error } = await supabase.storage
      .from('media-attachments')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[Supabase Storage] Upload error details:', error.message);
      return res.status(500).json({ error: `Supabase Storage upload failed: ${error.message}` });
    }

    // Retrieve public link URL
    const { data: urlData } = supabase.storage
      .from('media-attachments')
      .getPublicUrl(fileName);

    if (!urlData || !urlData.publicUrl) {
      return res.status(500).json({ error: 'Failed to generate public URL for uploaded file.' });
    }

    return res.json({
      publicUrl: urlData.publicUrl,
      mediaType: mediaType,
      fileName: file.originalname
    });

  } catch (error) {
    console.error('Error in uploadMedia:', error);
    return res.status(500).json({ error: 'Internal server error during media upload.' });
  }
}

module.exports = {
  uploadMedia,
};
