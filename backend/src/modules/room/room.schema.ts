import { z } from 'zod';

const uuidType = z.string().uuid('Invalid UUID format');

export const assignRoomSchema = z.object({
  body: z.object({
    roomId: uuidType,
    patientId: uuidType,
    doctorId: uuidType,
  }),
});
