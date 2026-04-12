import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware);
router.get('/dashboard', allowRoles('admin', 'super_admin'), AnalyticsController.getDashboard);

export default router;
