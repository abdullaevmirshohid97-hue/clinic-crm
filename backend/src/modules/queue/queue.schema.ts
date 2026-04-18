import { z } from 'zod';

const uuidType = z.string().uuid('Invalid UUID format');

export const addToQueueSchema = z.object({
  body: z.object({
    patientId: uuidType.optional().nullable(),
    doctorId: uuidType,
    patientName: z.string().optional(),
  }),
});

export const callNextSchema = z.object({
  body: z.object({
    doctorId: uuidType,
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['waiting', 'in_progress', 'completed', 'cancelled']),
  }),
});
