import { Router } from 'express';
import { instructorsController } from './instructors.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

// List instructors for a workshop
router.get(
  '/',
  authenticate,
  instructorsController.listWorkshopInstructors.bind(instructorsController)
);

// Add instructor to workshop (admin only)
router.post(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  instructorsController.addWorkshopInstructor.bind(instructorsController)
);

// Remove instructor from workshop (admin only)
router.delete(
  '/:instructorId',
  authenticate,
  requireRole(['ADMIN']),
  instructorsController.removeWorkshopInstructor.bind(instructorsController)
);

export default router;
