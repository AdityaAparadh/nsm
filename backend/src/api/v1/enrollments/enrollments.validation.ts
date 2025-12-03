import { z } from 'zod';
import { EnrollmentStatus } from '../../../../generated/prisma/index.js';

export const createEnrollmentSchema = z.object({
  participantId: z.number().int().positive(),
  workshopId: z.number().int().positive(),
  status: z.nativeEnum(EnrollmentStatus).default(EnrollmentStatus.PENDING),
});

export const updateEnrollmentSchema = z.object({
  status: z.nativeEnum(EnrollmentStatus),
});

export const listEnrollmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  workshopId: z.coerce.number().int().positive().optional(),
  participantId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(EnrollmentStatus).optional(),
});

export const enrollWithTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const generateEnrollmentLinkSchema = z.object({
  expiresIn: z.coerce.number().int().positive().default(604800), // 7 days in seconds
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;
export type EnrollWithTokenInput = z.infer<typeof enrollWithTokenSchema>;
export type GenerateEnrollmentLinkInput = z.infer<typeof generateEnrollmentLinkSchema>;
