import type { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service.js';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from './users.validation.js';
import { z } from 'zod';

export class UsersController {
  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listUsersQuerySchema.parse(req.query);
      const result = await usersService.listUsers(query);
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

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.userId ?? '', 10);

      if (isNaN(userId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid user ID',
        });
      }

      const user = await usersService.getUserById(userId);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'USER_NOT_FOUND',
          });
        }
      }
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createUserSchema.parse(req.body);
      const user = await usersService.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'User with this email already exists') {
          return res.status(409).json({
            error: 'Conflict',
            message: error.message,
            code: 'USER_ALREADY_EXISTS',
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

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.userId ?? '', 10);

      if (isNaN(userId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid user ID',
        });
      }

      const validatedData = updateUserSchema.parse(req.body);
      const user = await usersService.updateUser(userId, validatedData);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.issues[0]?.message || 'Validation failed',
          details: error.issues,
        });
      }

      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'USER_NOT_FOUND',
          });
        }

        if (error.message === 'Email already in use') {
          return res.status(409).json({
            error: 'Conflict',
            message: error.message,
            code: 'EMAIL_IN_USE',
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

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = parseInt(req.params.userId ?? '', 10);

      if (isNaN(userId)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid user ID',
        });
      }

      await usersService.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'User not found') {
          return res.status(404).json({
            error: 'Not Found',
            message: error.message,
            code: 'USER_NOT_FOUND',
          });
        }
      }
      next(error);
    }
  }
}

export const usersController = new UsersController();
