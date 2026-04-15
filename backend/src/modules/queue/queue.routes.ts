import { Router, RequestHandler } from 'express';
import { QueueController } from './queue.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { addToQueueSchema, callNextSchema } from './queue.schema';

const router = Router();

router.use(authMiddleware as RequestHandler);

router.post('/add', allowRoles('admin', 'reception', 'doctor', 'nurse') as RequestHandler, validate(addToQueueSchema), QueueController.addToQueue as RequestHandler);
router.get('/:doctorId', allowRoles('admin', 'reception', 'doctor', 'nurse') as RequestHandler, QueueController.getQueue as RequestHandler);
router.post('/next', allowRoles('doctor') as RequestHandler, validate(callNextSchema), QueueController.callNext as RequestHandler);
router.post('/:id/complete', allowRoles('doctor') as RequestHandler, QueueController.complete as RequestHandler);

export default router;
