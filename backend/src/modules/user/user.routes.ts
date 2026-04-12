import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { createStaffSchema, updateStaffSchema } from './user.schema';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Staff Management (Admin + Super Admin only)
router.get('/staff', allowRoles('admin', 'super_admin'), UserController.getStaff);
router.post('/staff', allowRoles('admin', 'super_admin'), validate(createStaffSchema), UserController.createStaff);
router.put('/staff/:id', allowRoles('admin', 'super_admin'), validate(updateStaffSchema), UserController.updateStaff);
router.delete('/staff/:id', allowRoles('admin', 'super_admin'), UserController.deleteStaff);

// Heartbeat (All authenticated users)
router.post('/heartbeat', UserController.heartbeat);

export default router;
