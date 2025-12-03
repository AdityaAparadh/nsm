import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';

const router = Router();

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', (req, res, next) => authController.signup(req, res, next));

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login to the system
 * @access  Public
 */
router.post('/login', (req, res, next) => authController.login(req, res, next));

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, (req, res, next) => authController.getCurrentUser(req, res, next));

export default router;
