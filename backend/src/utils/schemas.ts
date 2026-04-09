import { z } from 'zod';

// UUID validation helper
const uuidType = z.string().uuid('Invalid UUID format');

/**
 * USER (STAFF) SCHEMAS
 */
export const createStaffSchema = z.object({
  body: z.object({
    email: z.string().email(),
    full_name: z.string().min(3, 'Full name must be at least 3 characters'),
    role: z.enum(['admin', 'doctor', 'nurse', 'reception'])
  })
});

export const updateStaffSchema = z.object({
  body: z.object({
    full_name: z.string().min(3).optional(),
    role: z.enum(['admin', 'doctor', 'nurse', 'reception']).optional(),
    is_active: z.boolean().optional()
  })
});

/**
 * QUEUE SCHEMAS
 */
export const addToQueueSchema = z.object({
  body: z.object({
    patientId: uuidType,
    doctorId: uuidType,
    doctorPrefix: z.string().min(1, 'Doctor prefix is required')
  })
});

export const callNextSchema = z.object({
  body: z.object({
    doctorId: uuidType
  })
});

/**
 * ROOM SCHEMAS
 */
export const assignRoomSchema = z.object({
  body: z.object({
    roomId: uuidType,
    patientId: uuidType,
    doctorId: uuidType
  })
});

/**
 * LAB SCHEMAS
 */
export const updateLabStatusSchema = z.object({
  params: z.object({
    testId: uuidType
  }),
  body: z.object({
    status: z.enum(['pending', 'in_progress', 'done']),
    resultDetails: z.record(z.string(), z.any()).optional()
  })
});

/**
 * MARKETING SCHEMAS
 */
export const sendBulkSMSSchema = z.object({
  body: z.object({
    segment: z.enum(['all', 'active', 'archive', 'debtors']),
    message: z.string().min(5, 'Message must be at least 5 characters')
  })
});
