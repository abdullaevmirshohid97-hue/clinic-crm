import { z } from 'zod';

const uuidType = z.string().uuid('Invalid UUID format');

export const updateLabStatusSchema = z.object({
  params: z.object({
    testId: uuidType,
  }),
  body: z.object({
    status: z.enum(['pending', 'in_progress', 'done']),
    resultDetails: z.record(z.string(), z.any()).optional(),
  }),
});
