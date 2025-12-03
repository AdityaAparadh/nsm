import type { Request, Response, NextFunction } from 'express';
import { submissionsService } from './submissions.service.js';
import { createSubmissionSchema, listSubmissionsQuerySchema } from './submissions.validation.js';
import { z } from 'zod';

export class SubmissionsController {
  async listSubmissions(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listSubmissionsQuerySchema.parse(req.query);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const result = await submissionsService.listSubmissions(query, userId, userRoles);
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

  async getSubmissionById(req: Request, res: Response, next: NextFunction) {
    try {
      const submissionId = parseInt(req.params.submissionId ?? '', 10);

      if (isNaN(submissionId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid submission ID',
        });
      }

      const submission = await submissionsService.getSubmissionById(submissionId);
      res.status(200).json(submission);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Submission not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'SUBMISSION_NOT_FOUND',
          });
        }
      }
      next(error);
    }
  }

  async createSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createSubmissionSchema.parse(req.body);
      const submission = await submissionsService.createSubmission(validatedData);
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Participant not found' || error.message === 'Assignment not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: error.message.includes('Participant') ? 'PARTICIPANT_NOT_FOUND' : 'ASSIGNMENT_NOT_FOUND',
          });
        }

        if (error.message === 'Submission with this attempt number already exists') {
          return res.status(409).json({
            error: 'Conflict',
            message: error.message,
            code: 'SUBMISSION_EXISTS',
          });
        }

        if (error.message.includes('Score cannot exceed')) {
          return res.status(400).json({
            error: 'Bad Request',
            message: error.message,
            code: 'INVALID_SCORE',
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

  async getParticipantSubmissions(req: Request, res: Response, next: NextFunction) {
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

      const submissions = await submissionsService.getParticipantSubmissions(participantId, userId, userRoles);
      res.status(200).json(submissions);
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
            message: 'You do not have access to these submissions',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }
}

export const submissionsController = new SubmissionsController();
