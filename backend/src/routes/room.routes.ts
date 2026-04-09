import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { assignRoomSchema } from '../utils/schemas';

const router = Router();

// Require authentication
router.use(authMiddleware);

router.get('/', checkRole(['admin', 'doctor', 'nurse', 'reception']), RoomController.getRooms);
router.get('/:id', checkRole(['admin', 'doctor', 'nurse', 'reception']), RoomController.getRoomDetails);

router.post('/assign', checkRole(['admin', 'doctor', 'reception']), validate(assignRoomSchema), RoomController.assignPatient);
router.post('/discharge/:assignmentId', checkRole(['admin', 'doctor']), RoomController.dischargePatient);

export default router;
