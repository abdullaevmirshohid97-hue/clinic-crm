import { z } from 'zod';

export const addMedicineSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Medicine name must be at least 2 characters'),
    category: z.string().optional(),
    quantity: z.number().int().min(0).default(0),
    unit: z.string().default('dona'),
    price: z.number().min(0).default(0),
    expiry_date: z.string().optional(),
  }),
});

export const updateStockSchema = z.object({
  body: z.object({
    quantity: z.number().int().min(0),
    reason: z.string().optional(),
  }),
});
