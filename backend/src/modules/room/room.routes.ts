import { Router } from 'express';
import { RoomController } from './room.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { assignRoomSchema } from './room.schema';

const router = Router();

router.use(authMiddleware);

router.get('/', allowRoles('admin', 'super_admin', 'doctor', 'nurse', 'reception'), RoomController.getRooms);
router.get('/:id', allowRoles('admin', 'super_admin', 'doctor', 'nurse', 'reception'), RoomController.getRoomDetails);
router.post('/assign', allowRoles('admin', 'super_admin', 'doctor', 'reception'), validate(assignRoomSchema), RoomController.assignPatient);
router.post('/discharge/:assignmentId', allowRoles('admin', 'super_admin', 'doctor'), RoomController.dischargePatient);

export default router;
