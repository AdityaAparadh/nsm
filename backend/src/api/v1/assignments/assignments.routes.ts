import { Router } from 'express';
import { assignmentsController } from './assignments.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { Role } from '../../../../generated/prisma/index.js';

const router = Router({ mergeParams: true });

// All assignment routes require authentication
router.use(authenticate);

// List assignments for a workshop
router.get(
  '/',
  assignmentsController.listAssignments.bind(assignmentsController)
);

// Get assignment by ID
router.get(
  '/:assignmentId',
  assignmentsController.getAssignmentById.bind(assignmentsController)
);

// Create assignment (Admin or Instructor of the workshop)
router.post(
  '/',
  requireRole([Role.ADMIN, Role.INSTRUCTOR]),
  assignmentsController.createAssignment.bind(assignmentsController)
);

// Update assignment (Admin or Instructor of the workshop)
router.patch(
  '/:assignmentId',
  requireRole([Role.ADMIN, Role.INSTRUCTOR]),
  assignmentsController.updateAssignment.bind(assignmentsController)
);

// Delete assignment (Admin or Instructor of the workshop)
router.delete(
  '/:assignmentId',
  requireRole([Role.ADMIN, Role.INSTRUCTOR]),
  assignmentsController.deleteAssignment.bind(assignmentsController)
);

export default router;
