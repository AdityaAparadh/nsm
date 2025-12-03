import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { signupSchema, loginSchema } from './auth.validation.js';
import { z } from 'zod';

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const validatedData = signupSchema.parse(req.body);

      // Create user
      const result = await authService.signup(validatedData);

      res.status(201).json(result);
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

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate request body
      const validatedData = loginSchema.parse(req.body);

      // Authenticate user
      const result = await authService.login(validatedData);

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
        if (error.message === 'Invalid email or password') {
          return res.status(401).json({
            error: 'Unauthorized',
            message: error.message,
            code: 'INVALID_CREDENTIALS',
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

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      // Get user ID from request (set by auth middleware)
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
          code: 'MISSING_AUTH',
        });
      }

      // Get user data
      const user = await authService.getCurrentUser(userId);

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

        return res.status(400).json({
          error: 'Bad Request',
          message: error.message,
        });
      }

      next(error);
    }
  }
}

export const authController = new AuthController();
