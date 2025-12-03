import { z } from 'zod';

export const uploadPurposeEnum = z.enum([
  'WORKSHOP_HOME',
  'ASSIGNMENT_GRADER',
  'ASSIGNMENT_NOTEBOOK',
  'OTHER',
]);

export const uploadUrlRequestSchema = z
  .object({
    fileName: z.string().min(1, 'File name is required'),
    fileType: z.string().min(1, 'File type is required'),
    purpose: uploadPurposeEnum,
    workshopId: z.number().int().positive().optional(),
    assignmentId: z.number().int().positive().optional(),
    expiresIn: z.number().int().positive().default(3600),
  })
  .refine(
    (data) => {
      if (data.purpose === 'WORKSHOP_HOME' && !data.workshopId) {
        return false;
      }
      if (
        (data.purpose === 'ASSIGNMENT_GRADER' || data.purpose === 'ASSIGNMENT_NOTEBOOK') &&
        !data.assignmentId
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'workshopId is required for WORKSHOP_HOME, assignmentId is required for ASSIGNMENT_GRADER and ASSIGNMENT_NOTEBOOK',
      path: ['purpose'],
    }
  );

export const downloadUrlRequestSchema = z.object({
  s3Key: z.string().min(1, 'S3 key is required'),
  expiresIn: z.number().int().positive().default(3600),
});
