import { Router } from 'express';
import { enrollmentsController } from './enrollments.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { Role } from '../../../../generated/prisma/index.js';

const router = Router();

// All enrollment routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/enrollments
 * @desc    List enrollments (filtered by role)
 * @access  Private (All authenticated users)
 */
router.get('/', (req, res, next) => enrollmentsController.listEnrollments(req, res, next));

/**
 * @route   POST /api/v1/enrollments
 * @desc    Create enrollment
 * @access  Admin or Instructor (of the workshop)
 */
router.post('/', requireRole(Role.ADMIN, Role.INSTRUCTOR), (req, res, next) =>
  enrollmentsController.createEnrollment(req, res, next)
);

/**
 * @route   POST /api/v1/enrollments/enroll
 * @desc    Enroll using presigned token
 * @access  Private (All authenticated users)
 */
router.post('/enroll', (req, res, next) => enrollmentsController.enrollWithToken(req, res, next));

/**
 * @route   GET /api/v1/enrollments/:enrollmentId
 * @desc    Get enrollment by ID
 * @access  Private (Role-based access)
 */
router.get('/:enrollmentId', (req, res, next) => enrollmentsController.getEnrollmentById(req, res, next));

/**
 * @route   PATCH /api/v1/enrollments/:enrollmentId
 * @desc    Update enrollment status
 * @access  Admin or Instructor (of the workshop)
 */
router.patch('/:enrollmentId', requireRole(Role.ADMIN, Role.INSTRUCTOR), (req, res, next) =>
  enrollmentsController.updateEnrollment(req, res, next)
);

/**
 * @route   DELETE /api/v1/enrollments/:enrollmentId
 * @desc    Delete enrollment
 * @access  Admin only
 */
router.delete('/:enrollmentId', requireRole(Role.ADMIN), (req, res, next) =>
  enrollmentsController.deleteEnrollment(req, res, next)
);

export default router;
