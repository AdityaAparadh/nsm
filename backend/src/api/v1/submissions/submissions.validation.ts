import { z } from 'zod';

export const createSubmissionSchema = z.object({
  participantId: z.number().int().positive(),
  assignmentId: z.number().int().positive(),
  score: z.number().min(0),
  attemptNumber: z.number().int().positive().default(1),
});

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  participantId: z.coerce.number().int().positive().optional(),
  assignmentId: z.coerce.number().int().positive().optional(),
  workshopId: z.coerce.number().int().positive().optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
