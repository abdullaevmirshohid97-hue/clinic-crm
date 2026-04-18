import { Router, RequestHandler } from 'express';
import { QueueController } from './queue.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { addToQueueSchema, callNextSchema, updateStatusSchema } from './queue.schema';

const router = Router();

router.use(authMiddleware as RequestHandler);

// Get queue by date (for Queue page)
router.get('/', allowRoles('admin', 'reception', 'doctor', 'nurse', 'cashier') as RequestHandler, QueueController.getByDate as RequestHandler);

// Get doctors for queue
router.get('/doctors', allowRoles('admin', 'reception', 'doctor', 'nurse', 'cashier') as RequestHandler, QueueController.getDoctors as RequestHandler);

// Add to queue
router.post('/add', allowRoles('admin', 'reception', 'doctor', 'nurse') as RequestHandler, validate(addToQueueSchema), QueueController.addToQueue as RequestHandler);

// Update queue status
router.patch('/:id/status', allowRoles('admin', 'reception', 'doctor', 'nurse') as RequestHandler, validate(updateStatusSchema), QueueController.updateStatus as RequestHandler);

// Get queue by doctor
router.get('/doctor/:doctorId', allowRoles('admin', 'reception', 'doctor', 'nurse') as RequestHandler, QueueController.getQueue as RequestHandler);

// Call next patient
router.post('/next', allowRoles('admin', 'doctor') as RequestHandler, validate(callNextSchema), QueueController.callNext as RequestHandler);

// Complete queue entry
router.post('/:id/complete', allowRoles('admin', 'doctor') as RequestHandler, QueueController.complete as RequestHandler);

export default router;
