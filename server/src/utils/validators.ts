import { z } from 'zod';

// ─── Common ───────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ─── Auth ─────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ─── Clinic ───────────────────────────────────────────────────────────────

export const updateClinicSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number').optional(),
  address: z.string().max(500).optional(),
});

// ─── Patient ──────────────────────────────────────────────────────────────

export const createPatientSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(200),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number').optional(),
  date_of_birth: z.string().datetime({ offset: true }).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

// ─── SMS Job ──────────────────────────────────────────────────────────────

export const smsJobSchema = z.object({
  patient_id: uuidSchema,
  phone: z.string().regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number'),
  message: z.string().min(1).max(160, 'SMS message must be 160 characters or less'),
});

// ─── Backup Job ───────────────────────────────────────────────────────────

export const backupJobSchema = z.object({
  clinic_id: uuidSchema,
});

// ─── Validation helper ────────────────────────────────────────────────────

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Validation failed: ${messages}`);
  }
  return result.data;
}
