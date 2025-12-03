import { Router } from 'express';
import { certificatesController } from './certificates.controller.js';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';

const router = Router();

// Verify certificate by UUID (public endpoint - must come before /:certificateId)
router.get(
  '/verify/:uuid',
  certificatesController.verifyCertificate.bind(certificatesController)
);

// Get participant certificates (participants can see their own, admins can see anyone's)
router.get(
  '/participants/:participantId/certificates',
  authenticate,
  certificatesController.getParticipantCertificates.bind(certificatesController)
);

// List certificates (role-based access)
router.get(
  '/',
  authenticate,
  certificatesController.listCertificates.bind(certificatesController)
);

// Generate certificate (admin only)
router.post(
  '/',
  authenticate,
  requireRole(['ADMIN']),
  certificatesController.generateCertificate.bind(certificatesController)
);

// Get certificate by ID (admin only)
router.get(
  '/:certificateId',
  authenticate,
  requireRole(['ADMIN']),
  certificatesController.getCertificateById.bind(certificatesController)
);

export default router;
