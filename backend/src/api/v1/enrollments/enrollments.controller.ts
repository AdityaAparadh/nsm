import type { Request, Response, NextFunction } from 'express';
import { enrollmentsService } from './enrollments.service.js';
import {
  createEnrollmentSchema,
  updateEnrollmentSchema,
  listEnrollmentsQuerySchema,
  enrollWithTokenSchema,
  generateEnrollmentLinkSchema,
} from './enrollments.validation.js';
import { z } from 'zod';

export class EnrollmentsController {
  async listEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listEnrollmentsQuerySchema.parse(req.query);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const result = await enrollmentsService.listEnrollments(query, userId, userRoles);
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

  async getEnrollmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollmentId = parseInt(req.params.enrollmentId ?? '', 10);

      if (isNaN(enrollmentId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid enrollment ID',
        });
      }

      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const enrollment = await enrollmentsService.getEnrollmentById(enrollmentId, userId, userRoles);
      res.status(200).json(enrollment);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Enrollment not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'ENROLLMENT_NOT_FOUND',
          });
        }

        if (error.message === 'Access denied') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to this enrollment',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }

  async createEnrollment(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createEnrollmentSchema.parse(req.body);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const enrollment = await enrollmentsService.createEnrollment(validatedData, userId, userRoles);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Workshop not found' || error.message === 'Participant not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: error.message.includes('Workshop') ? 'WORKSHOP_NOT_FOUND' : 'PARTICIPANT_NOT_FOUND',
          });
        }

        if (error.message === 'Enrollment already exists') {
          return res.status(409).json({
            error: 'Conflict',
            message: error.message,
            code: 'ENROLLMENT_EXISTS',
          });
        }

        if (error.message === 'Access denied') {
          return res.status(403).json({
            error: 'Forbidden',
            message: error.message,
            code: 'ACCESS_DENIED',
          });
        }

        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      next(error);
    }
  }

  async updateEnrollment(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollmentId = parseInt(req.params.enrollmentId ?? '', 10);

      if (isNaN(enrollmentId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid enrollment ID',
        });
      }

      const validatedData = updateEnrollmentSchema.parse(req.body);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const enrollment = await enrollmentsService.updateEnrollment(enrollmentId, validatedData, userId, userRoles);
      res.status(200).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Enrollment not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'ENROLLMENT_NOT_FOUND',
          });
        }

        if (error.message === 'Access denied') {
          return res.status(403).json({
            error: 'Forbidden',
            message: error.message,
            code: 'ACCESS_DENIED',
          });
        }

        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      next(error);
    }
  }

  async deleteEnrollment(req: Request, res: Response, next: NextFunction) {
    try {
      const enrollmentId = parseInt(req.params.enrollmentId ?? '', 10);

      if (isNaN(enrollmentId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid enrollment ID',
        });
      }

      await enrollmentsService.deleteEnrollment(enrollmentId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Enrollment not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'ENROLLMENT_NOT_FOUND',
          });
        }
      }
      next(error);
    }
  }

  async generateEnrollmentLink(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
        });
      }

      const validatedData = generateEnrollmentLinkSchema.parse(req.body);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;
      const result = await enrollmentsService.generateEnrollmentLink(workshopId, validatedData, userId, userRoles);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Workshop not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'WORKSHOP_NOT_FOUND',
          });
        }

        if (error.message === 'Access denied') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to generate enrollment links for this workshop',
            code: 'ACCESS_DENIED',
          });
        }

        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      next(error);
    }
  }

  async enrollWithToken(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = enrollWithTokenSchema.parse(req.body);
      const userId = req.user!.userId;

      const enrollment = await enrollmentsService.enrollWithToken(validatedData, userId);
      res.status(201).json(enrollment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Invalid or expired enrollment token') {
          return res.status(401).json({
            error: 'Unauthorized',
            message: error.message,
            code: 'INVALID_TOKEN',
          });
        }

        if (error.message === 'Workshop not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'WORKSHOP_NOT_FOUND',
          });
        }

        if (error.message === 'Already enrolled in this workshop') {
          return res.status(409).json({
            error: 'Conflict',
            message: error.message,
            code: 'ALREADY_ENROLLED',
          });
        }

        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      next(error);
    }
  }
}

export const enrollmentsController = new EnrollmentsController();
