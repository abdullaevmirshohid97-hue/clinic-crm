import { Router } from 'express';
import { QueueController } from '../controllers/queue.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { addToQueueSchema, callNextSchema } from '../utils/schemas';

const router = Router();

// Require authentication for all queue routes
router.use(authMiddleware);

router.post('/add', checkRole(['admin', 'reception', 'doctor', 'nurse']), validate(addToQueueSchema), QueueController.addToQueue);
router.get('/:doctorId', checkRole(['admin', 'reception', 'doctor', 'nurse']), QueueController.getQueue);
router.post('/next', checkRole(['doctor']), validate(callNextSchema), QueueController.callNext);
router.post('/:id/complete', checkRole(['doctor']), QueueController.complete);

export default router;
