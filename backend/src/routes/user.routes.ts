import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStaffSchema, updateStaffSchema } from '../utils/schemas';

const router = Router();

// Staff Management (Admin only)
router.get('/staff', authMiddleware, checkRole(['admin']), UserController.getStaff);
router.post('/staff', authMiddleware, checkRole(['admin']), validate(createStaffSchema), UserController.createStaff);
router.put('/staff/:id', authMiddleware, checkRole(['admin']), validate(updateStaffSchema), UserController.updateStaff);
router.delete('/staff/:id', authMiddleware, checkRole(['admin']), UserController.deleteStaff);

// Heartbeat (All authenticated users)
router.post('/heartbeat', authMiddleware, UserController.heartbeat);

export default router;
