import { Router } from 'express';
import { loadController } from './load.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { Role } from '../../../../generated/prisma/index.js';

const router = Router();

// All load routes require authentication and admin role
router.use(authenticate);

/**
 * @route   POST /api/v1/load/:workshopId
 * @desc    Load workshop - sets up the workshop environment
 * @access  Admin only
 * 
 * This endpoint:
 * 1. Updates WORKSHOP_ID in /root/.env
 * 2. Downloads the workshop home zip from S3 to /usr/local/share/jupyterhub_home.zip
 * 3. Creates local system users for each participant and instructor (if they don't exist)
 * 4. Adds all users to the 'jupyterhub_users' group
 * 
 * Note: Requires the server to have sudo privileges for system operations
 */
router.post('/:workshopId', requireRole(Role.ADMIN), (req, res, next) =>
  loadController.loadWorkshop(req, res, next)
);

export default router;
