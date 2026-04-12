import { z } from 'zod';

const uuidType = z.string().uuid('Invalid UUID format');

export const addToQueueSchema = z.object({
  body: z.object({
    patientId: uuidType,
    doctorId: uuidType,
    doctorPrefix: z.string().min(1, 'Doctor prefix is required'),
  }),
});

export const callNextSchema = z.object({
  body: z.object({
    doctorId: uuidType,
  }),
});
