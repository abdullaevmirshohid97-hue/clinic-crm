import { z } from 'zod';

export const createPatientSchema = z.object({
  body: z.object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    phone: z.string().min(9).optional(),
    birth_date: z.string().optional(),
    gender: z.enum(['male', 'female']).optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    doctor_id: z.string().uuid().optional(),
  }),
});

export const updatePatientSchema = z.object({
  body: z.object({
    full_name: z.string().min(2).optional(),
    phone: z.string().min(9).optional(),
    birth_date: z.string().optional(),
    gender: z.enum(['male', 'female']).optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  }),
});
