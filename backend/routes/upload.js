const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  generateSignedUrl,
  handleUploadComplete,
  getUploadStatus,
  cancelUpload,
  cancelMultipleUploads,
  deleteUpload
} = require('../controllers/upload');

/**
 * Generate signed URL for direct upload to Supabase Storage
 * POST /api/v1/upload/signed-url
 */
router.post('/signed-url', auth, generateSignedUrl);

/**
 * Handle upload completion and metadata processing
 * POST /api/v1/upload/complete
 */
router.post('/complete', auth, handleUploadComplete);

/**
 * Get upload status and metadata
 * GET /api/v1/upload/status/:uploadId
 */
router.get('/status/:uploadId', auth, getUploadStatus);

/**
 * Cancel ongoing upload
 * POST /api/v1/upload/cancel/:uploadId
 */
router.post('/cancel/:uploadId', auth, cancelUpload);

/**
 * Cancel multiple uploads
 * POST /api/v1/upload/cancel-multiple
 */
router.post('/cancel-multiple', auth, cancelMultipleUploads);

/**
 * Delete uploaded file
 * DELETE /api/v1/upload/:uploadId
 */
router.delete('/:uploadId', auth, deleteUpload);

module.exports = router;
