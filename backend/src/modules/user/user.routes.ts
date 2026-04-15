import { Router, RequestHandler } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { createStaffSchema, updateStaffSchema } from './user.schema';

const router = Router();

// All routes require authentication
router.use(authMiddleware as RequestHandler);

// Staff Management (Admin + Super Admin only)
router.get('/staff', allowRoles('admin', 'super_admin') as RequestHandler, UserController.getStaff as RequestHandler);
router.post('/staff', allowRoles('admin', 'super_admin') as RequestHandler, validate(createStaffSchema), UserController.createStaff as RequestHandler);
router.put('/staff/:id', allowRoles('admin', 'super_admin') as RequestHandler, validate(updateStaffSchema), UserController.updateStaff as RequestHandler);
router.delete('/staff/:id', allowRoles('admin', 'super_admin') as RequestHandler, UserController.deleteStaff as RequestHandler);

// Heartbeat (All authenticated users)
router.post('/heartbeat', UserController.heartbeat as RequestHandler);

export default router;
