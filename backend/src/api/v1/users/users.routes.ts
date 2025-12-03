import { Router } from 'express';
import { usersController } from './users.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { Role } from '../../../../generated/prisma/index.js';

const router = Router();

// All user routes require authentication and admin role
router.use(authenticate, requireRole(Role.ADMIN));

/**
 * @route   GET /api/v1/users
 * @desc    List all users
 * @access  Admin
 */
router.get('/', (req, res, next) => usersController.listUsers(req, res, next));

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Admin
 */
router.post('/', (req, res, next) => usersController.createUser(req, res, next));

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/:userId', (req, res, next) => usersController.getUserById(req, res, next));

/**
 * @route   PATCH /api/v1/users/:userId
 * @desc    Update user
 * @access  Admin
 */
router.patch('/:userId', (req, res, next) => usersController.updateUser(req, res, next));

/**
 * @route   DELETE /api/v1/users/:userId
 * @desc    Delete user
 * @access  Admin
 */
router.delete('/:userId', (req, res, next) => usersController.deleteUser(req, res, next));

export default router;
