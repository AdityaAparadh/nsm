import { z } from 'zod';

export const addInstructorSchema = z.object({
  instructorId: z.number().int().positive(),
});
