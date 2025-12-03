import type { Request, Response, NextFunction } from 'express';
import { certificatesService } from './certificates.service.js';
import { generateCertificateSchema, listCertificatesQuerySchema, verifyCertificateSchema } from './certificates.validation.js';
import { z } from 'zod';

export class CertificatesController {
  async listCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listCertificatesQuerySchema.parse(req.query);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const result = await certificatesService.listCertificates(query, userId, userRoles);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }
      next(error);
    }
  }

  async getCertificateById(req: Request, res: Response, next: NextFunction) {
    try {
      const certificateId = parseInt(req.params.certificateId ?? '', 10);

      if (isNaN(certificateId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid certificate ID',
        });
      }

      const certificate = await certificatesService.getCertificateById(certificateId);
      res.status(200).json(certificate);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Certificate not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'CERTIFICATE_NOT_FOUND',
          });
        }
      }
      next(error);
    }
  }

  async generateCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = generateCertificateSchema.parse(req.body);
      const certificate = await certificatesService.generateCertificate(validatedData);
      res.status(201).json(certificate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Participant not found' || error.message === 'Workshop not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: error.message.includes('Participant') ? 'PARTICIPANT_NOT_FOUND' : 'WORKSHOP_NOT_FOUND',
          });
        }

        if (error.message === 'Certificate already exists for this participant and workshop') {
          return res.status(409).json({
            error: 'Conflict',
            message: error.message,
            code: 'CERTIFICATE_EXISTS',
          });
        }

        if (
          error.message === 'User is not a participant' ||
          error.message === 'Participant is not enrolled in this workshop' ||
          error.message.includes('has not met requirements')
        ) {
          return res.status(400).json({
            error: 'Bad Request',
            message: error.message,
            code: 'REQUIREMENTS_NOT_MET',
          });
        }
      }
      next(error);
    }
  }

  async verifyCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const { uuid } = verifyCertificateSchema.parse({ uuid: req.params.uuid });
      const certificate = await certificatesService.verifyCertificate(uuid);
      res.status(200).json(certificate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Invalid UUID format',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Certificate not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Certificate not found or invalid',
            code: 'CERTIFICATE_NOT_FOUND',
          });
        }
      }
      next(error);
    }
  }

  async getParticipantCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const participantId = parseInt(req.params.participantId ?? '', 10);

      if (isNaN(participantId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid participant ID',
        });
      }

      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const certificates = await certificatesService.getParticipantCertificates(participantId, userId, userRoles);
      res.status(200).json(certificates);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Participant not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'PARTICIPANT_NOT_FOUND',
          });
        }

        if (error.message === 'Access denied') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to these certificates',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }
}

export const certificatesController = new CertificatesController();
