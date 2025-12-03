import { Router } from 'express';
import { submissionsController } from './submissions.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';

const router = Router();

// List submissions (admin only)
router.get(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  submissionsController.listSubmissions.bind(submissionsController)
);

// Get submission by ID
router.get(
  '/:submissionId',
  authenticate,
  submissionsController.getSubmissionById.bind(submissionsController)
);

// Create submission (admin only)
router.post(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  submissionsController.createSubmission.bind(submissionsController)
);

// Get all submissions for a participant
router.get(
  '/participants/:participantId/submissions',
  authenticate,
  submissionsController.getParticipantSubmissions.bind(submissionsController)
);

export default router;
