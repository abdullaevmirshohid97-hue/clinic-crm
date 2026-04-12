import { z } from 'zod';

export const sendBulkSMSSchema = z.object({
  body: z.object({
    segment: z.enum(['all', 'active', 'archive', 'debtors']),
    message: z.string().min(5, 'Message must be at least 5 characters'),
  }),
});
