import { Router } from 'express';
import { NurseController } from './nurse.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/dashboard', allowRoles('admin', 'super_admin', 'nurse', 'doctor'), NurseController.getDashboard);

export default router;
