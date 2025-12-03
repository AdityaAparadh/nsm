import type { Request, Response, NextFunction } from 'express';
import { workshopsService } from './workshops.service.js';
import { createWorkshopSchema, updateWorkshopSchema, listWorkshopsQuerySchema } from './workshops.validation.js';
import { z } from 'zod';

export class WorkshopsController {
  async listWorkshops(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listWorkshopsQuerySchema.parse(req.query);
      const userId = req.user!.userId;
      const userRoles = req.user!.roles;

      const result = await workshopsService.listWorkshops(query, userId, userRoles);
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

  async getWorkshopById(req: Request, res: Response, next: NextFunction) {
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

      const workshop = await workshopsService.getWorkshopById(workshopId, userId, userRoles);
      res.status(200).json(workshop);
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
            message: 'You do not have access to this workshop',
            code: 'ACCESS_DENIED',
          });
        }
      }
      next(error);
    }
  }

  async createWorkshop(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createWorkshopSchema.parse(req.body);
      const workshop = await workshopsService.createWorkshop(validatedData);
      res.status(201).json(workshop);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      next(error);
    }
  }

  async updateWorkshop(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
        });
      }

      const validatedData = updateWorkshopSchema.parse(req.body);
      const workshop = await workshopsService.updateWorkshop(workshopId, validatedData);
      res.status(200).json(workshop);
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

        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      next(error);
    }
  }

  async deleteWorkshop(req: Request, res: Response, next: NextFunction) {
    try {
      const workshopId = parseInt(req.params.workshopId ?? '', 10);

      if (isNaN(workshopId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid workshop ID',
        });
      }

      await workshopsService.deleteWorkshop(workshopId);
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
      }
      next(error);
    }
  }
}

export const workshopsController = new WorkshopsController();
