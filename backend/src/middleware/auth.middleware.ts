import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import type { JwtPayload } from '../utils/jwt.js';
import { Role } from '../../generated/prisma/index.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing JWT token',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = verifyToken(token);
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired JWT token',
        code: 'INVALID_TOKEN',
      });
    }
  } catch (error) {
    next(error);
  }
};

export const requireRole = (allowedRoles: Role | Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'MISSING_AUTH',
      });
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const hasRole = req.user.roles.some(role => rolesArray.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};
