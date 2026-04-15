import { Router, RequestHandler } from 'express';
import { NurseController } from './nurse.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware as RequestHandler);
router.get('/dashboard', allowRoles('admin', 'super_admin', 'nurse', 'doctor') as RequestHandler, NurseController.getDashboard as RequestHandler);

export default router;
