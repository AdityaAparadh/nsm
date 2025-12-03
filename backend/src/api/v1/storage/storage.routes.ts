import { Router } from 'express';
import { storageController } from './storage.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';

const router = Router();

// Generate presigned upload URL (Admin or Instructor)
router.post(
  '/upload-url',
  authenticate,
  requireRole(['ADMIN', 'INSTRUCTOR']),
  storageController.generateUploadUrl.bind(storageController)
);

// Generate presigned download URL (Admin or Instructor)
router.post(
  '/download-url',
  authenticate,
  requireRole(['ADMIN', 'INSTRUCTOR']),
  storageController.generateDownloadUrl.bind(storageController)
);

export default router;
