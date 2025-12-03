import type { Request, Response, NextFunction } from 'express';
import { assignmentsService } from './assignments.service.js';
import { createAssignmentSchema, updateAssignmentSchema } from './assignments.validation.js';
import { z } from 'zod';

export class AssignmentsController {
  async listAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
        });
      }

      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const assignments = await assignmentsService.listAssignments(workshopId, userId, userRoles);
      res.status(200).json(assignments);
    } catch (error) {
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
            message: 'You do not have access to view assignments for this workshop',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }

  async getAssignmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);
      const assignmentId = parseInt(req.params.assignmentId ?? '', 10);

      if (isNaN(workshopId) || isNaN(assignmentId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID or assignment ID',
        });
      }

      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const assignment = await assignmentsService.getAssignmentById(workshopId, assignmentId, userId, userRoles);
      res.status(200).json(assignment);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Assignment not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'ASSIGNMENT_NOT_FOUND',
          });
        }

        if (error.message === 'Access denied') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to view this assignment',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }

  async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
        });
      }

      const validatedData = createAssignmentSchema.parse(req.body);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const assignment = await assignmentsService.createAssignment(workshopId, validatedData, userId, userRoles);
      res.status(201).json(assignment);
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
            message: 'You do not have access to create assignments for this workshop',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }

  async updateAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);
      const assignmentId = parseInt(req.params.assignmentId ?? '', 10);

      if (isNaN(workshopId) || isNaN(assignmentId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID or assignment ID',
        });
      }

      const validatedData = updateAssignmentSchema.parse(req.body);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const assignment = await assignmentsService.updateAssignment(workshopId, assignmentId, validatedData, userId, userRoles);
      res.status(200).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'Assignment not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'ASSIGNMENT_NOT_FOUND',
          });
        }

        if (error.message === 'Access denied') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to update this assignment',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }

  async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);
      const assignmentId = parseInt(req.params.assignmentId ?? '', 10);

      if (isNaN(workshopId) || isNaN(assignmentId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID or assignment ID',
        });
      }

      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      await assignmentsService.deleteAssignment(workshopId, assignmentId, userId, userRoles);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Assignment not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'ASSIGNMENT_NOT_FOUND',
          });
        }

        if (error.message === 'Access denied') {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have access to delete this assignment',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }
}

export const assignmentsController = new AssignmentsController();
