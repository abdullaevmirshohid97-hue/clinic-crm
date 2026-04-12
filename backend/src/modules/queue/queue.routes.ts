import { Router } from 'express';
import { QueueController } from './queue.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { addToQueueSchema, callNextSchema } from './queue.schema';

const router = Router();

router.use(authMiddleware);

router.post('/add', allowRoles('admin', 'reception', 'doctor', 'nurse'), validate(addToQueueSchema), QueueController.addToQueue);
router.get('/:doctorId', allowRoles('admin', 'reception', 'doctor', 'nurse'), QueueController.getQueue);
router.post('/next', allowRoles('doctor'), validate(callNextSchema), QueueController.callNext);
router.post('/:id/complete', allowRoles('doctor'), QueueController.complete);

export default router;
