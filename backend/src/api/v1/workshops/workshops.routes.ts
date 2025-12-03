import { Router } from 'express';
import { workshopsController } from './workshops.controller.js';
import { enrollmentsController } from '../enrollments/enrollments.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { Role } from '../../../../generated/prisma/index.js';
import instructorsRoutes from '../instructors/instructors.routes.js';
import assignmentsRoutes from '../assignments/assignments.routes.js';

const router = Router();

// All workshop routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/workshops
 * @desc    List workshops (filtered by role)
 * @access  Private (All authenticated users)
 */
router.get('/', (req, res, next) => workshopsController.listWorkshops(req, res, next));

/**
 * @route   POST /api/v1/workshops
 * @desc    Create a new workshop
 * @access  Admin only
 */
router.post('/', requireRole(Role.ADMIN), (req, res, next) =>
  workshopsController.createWorkshop(req, res, next)
);

/**
 * @route   GET /api/v1/workshops/:workshopId
 * @desc    Get workshop by ID (with access control)
 * @access  Private (Role-based access)
 */
router.get('/:workshopId', (req, res, next) => workshopsController.getWorkshopById(req, res, next));

/**
 * @route   POST /api/v1/workshops/:workshopId/enrollment-link
 * @desc    Generate presigned enrollment link
 * @access  Admin or Instructor (of the workshop)
 */
router.post('/:workshopId/enrollment-link', requireRole([Role.ADMIN, Role.INSTRUCTOR]), (req, res, next) =>
  enrollmentsController.generateEnrollmentLink(req, res, next)
);

/**
 * @route   PATCH /api/v1/workshops/:workshopId
 * @desc    Update workshop
 * @access  Admin or Instructor (of the workshop)
 */
router.patch('/:workshopId', requireRole([Role.ADMIN, Role.INSTRUCTOR]), (req, res, next) =>
  workshopsController.updateWorkshop(req, res, next)
);

/**
 * @route   DELETE /api/v1/workshops/:workshopId
 * @desc    Delete workshop
 * @access  Admin only
 */
router.delete('/:workshopId', requireRole(Role.ADMIN), (req, res, next) =>
  workshopsController.deleteWorkshop(req, res, next)
);

/**
 * @route   /api/v1/workshops/:workshopId/instructors
 * @desc    Instructor management routes (nested)
 * @access  Private
 */
router.use('/:workshopId/instructors', instructorsRoutes);

/**
 * @route   /api/v1/workshops/:workshopId/assignments
 * @desc    Assignment management routes (nested)
 * @access  Private
 */
router.use('/:workshopId/assignments', assignmentsRoutes);

export default router;
