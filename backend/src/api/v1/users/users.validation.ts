import { z } from 'zod';
import { Role } from '../../../../generated/prisma/index.js';

export const createUserSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roles: z.array(z.nativeEnum(Role)).min(1, 'At least one role is required'),
  additionalInfo: z.record(z.unknown()).optional().nullable(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  email: z.string().email('Invalid email address').optional(),
  roles: z.array(z.nativeEnum(Role)).min(1).optional(),
  additionalInfo: z.record(z.unknown()).optional().nullable(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.nativeEnum(Role).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
