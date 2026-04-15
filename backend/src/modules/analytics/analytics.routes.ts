import { Router, RequestHandler } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authMiddleware as RequestHandler);
router.get('/dashboard', allowRoles('admin', 'super_admin') as RequestHandler, AnalyticsController.getDashboard as RequestHandler);

export default router;
