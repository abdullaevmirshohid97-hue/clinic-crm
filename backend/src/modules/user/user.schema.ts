import { z } from 'zod';

export const createStaffSchema = z.object({
  body: z.object({
    email: z.string().email(),
    full_name: z.string().min(3, 'Full name must be at least 3 characters'),
    role: z.enum(['admin', 'doctor', 'nurse', 'reception']),
  }),
});

export const updateStaffSchema = z.object({
  body: z.object({
    full_name: z.string().min(3).optional(),
    role: z.enum(['admin', 'doctor', 'nurse', 'reception']).optional(),
    is_active: z.boolean().optional(),
  }),
});
