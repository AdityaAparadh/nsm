import type { Request, Response, NextFunction } from 'express';
import { instructorsService } from './instructors.service.js';
import { addInstructorSchema } from './instructors.validation.js';
import { z } from 'zod';

export class InstructorsController {
  async listWorkshopInstructors(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
        });
      }

      const instructors = await instructorsService.listWorkshopInstructors(workshopId);
      res.status(200).json(instructors);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Workshop not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'WORKSHOP_NOT_FOUND',
          });
        }
      }
      next(error);
    }
  }

  async addWorkshopInstructor(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
        });
      }

      const validatedData = addInstructorSchema.parse(req.body);
      const instructor = await instructorsService.addWorkshopInstructor(workshopId, validatedData.instructorId);
      res.status(201).json(instructor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Workshop not found' || error.message === 'Instructor not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: error.message.includes('Workshop') ? 'WORKSHOP_NOT_FOUND' : 'INSTRUCTOR_NOT_FOUND',
          });
        }

        if (error.message === 'Instructor already assigned to this workshop') {
          return res.status(409).json({
            error: 'Conflict',
            message: error.message,
            code: 'INSTRUCTOR_ALREADY_ASSIGNED',
          });
        }

        if (error.message === 'User is not an instructor') {
          return res.status(400).json({
            error: 'Bad Request',
            message: error.message,
            code: 'INVALID_ROLE',
          });
        }
      }
      next(error);
    }
  }

  async removeWorkshopInstructor(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);
      const instructorId = parseInt(req.params.instructorId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
        });
      }

      if (isNaN(instructorId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid instructor ID',
        });
      }

      await instructorsService.removeWorkshopInstructor(workshopId, instructorId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Workshop not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'WORKSHOP_NOT_FOUND',
          });
        }

        if (error.message === 'Instructor not assigned to this workshop') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'INSTRUCTOR_NOT_ASSIGNED',
          });
        }
      }
      next(error);
    }
  }
}

export const instructorsController = new InstructorsController();
