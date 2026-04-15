import { Router, RequestHandler } from 'express';
import { RoomController } from './room.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { assignRoomSchema } from './room.schema';

const router = Router();

router.use(authMiddleware as RequestHandler);

router.get('/', allowRoles('admin', 'super_admin', 'doctor', 'nurse', 'reception') as RequestHandler, RoomController.getRooms as RequestHandler);
router.get('/:id', allowRoles('admin', 'super_admin', 'doctor', 'nurse', 'reception') as RequestHandler, RoomController.getRoomDetails as RequestHandler);
router.post('/assign', allowRoles('admin', 'super_admin', 'doctor', 'reception') as RequestHandler, validate(assignRoomSchema), RoomController.assignPatient as RequestHandler);
router.post('/discharge/:assignmentId', allowRoles('admin', 'super_admin', 'doctor') as RequestHandler, RoomController.dischargePatient as RequestHandler);

export default router;
