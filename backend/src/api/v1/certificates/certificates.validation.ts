import { z } from 'zod';

export const generateCertificateSchema = z.object({
  participantId: z.number().int().positive(),
  workshopId: z.number().int().positive(),
});

export const listCertificatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  participantId: z.coerce.number().int().positive().optional(),
  workshopId: z.coerce.number().int().positive().optional(),
});

export const verifyCertificateSchema = z.object({
  uuid: z.string().uuid(),
});
