import { z } from 'zod';
import { WorkshopStatus } from '../../../../generated/prisma/index.js';

export const createWorkshopSchema = z.object({
  name: z.string().min(1, 'Workshop name is required').max(255),
  status: z.nativeEnum(WorkshopStatus).default(WorkshopStatus.DRAFT),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  requiredPassedAssignments: z.number().int().positive().optional().nullable(),
  s3HomeZipKey: z.string().optional().nullable(),
  additionalInfo: z.record(z.unknown()).optional().nullable(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.endDate >= data.startDate;
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['endDate'],
  }
);

export const updateWorkshopSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.nativeEnum(WorkshopStatus).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  requiredPassedAssignments: z.number().int().positive().optional().nullable(),
  s3HomeZipKey: z.string().optional().nullable(),
  additionalInfo: z.record(z.unknown()).optional().nullable(),
});

export const listWorkshopsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(WorkshopStatus).optional(),
});

export type CreateWorkshopInput = z.infer<typeof createWorkshopSchema>;
export type UpdateWorkshopInput = z.infer<typeof updateWorkshopSchema>;
export type ListWorkshopsQuery = z.infer<typeof listWorkshopsQuerySchema>;
