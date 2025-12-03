import { z } from 'zod';
import { EvaluationType } from '../../../../generated/prisma/index.js';

export const createAssignmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  maximumScore: z.number().int().min(0),
  passingScore: z.number().int().min(0),
  assignmentOrder: z.number().int().min(1),
  isCompulsory: z.boolean().default(true),
  evaluationType: z.nativeEnum(EvaluationType),
  notebookPath: z.string().optional(),
  graderImage: z.string().optional(),
  s3EvalBinaryKey: z.string().optional(),
  referenceData: z.any().optional(),
});

export const updateAssignmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  maximumScore: z.number().int().min(0).optional(),
  passingScore: z.number().int().min(0).optional(),
  assignmentOrder: z.number().int().min(1).optional(),
  isCompulsory: z.boolean().optional(),
  evaluationType: z.nativeEnum(EvaluationType).optional(),
  notebookPath: z.string().optional(),
  graderImage: z.string().optional(),
  s3EvalBinaryKey: z.string().optional(),
  referenceData: z.any().optional(),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
