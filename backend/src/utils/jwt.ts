import jwt from 'jsonwebtoken';
import { Role } from '../../generated/prisma/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: number;
  email: string;
  roles: Role[];
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const generateEnrollmentToken = (workshopId: number, expiresIn: string = '7d'): string => {
  return jwt.sign({ workshopId }, JWT_SECRET, { expiresIn });
};

export const verifyEnrollmentToken = (token: string): { workshopId: number } => {
  try {
    return jwt.verify(token, JWT_SECRET) as { workshopId: number };
  } catch (error) {
    throw new Error('Invalid or expired enrollment token');
  }
};
