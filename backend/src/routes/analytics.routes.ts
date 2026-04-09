import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware, checkRole } from '../middleware/auth';

const router = Router();

// Only admin can access the full analytics dashboard
router.use(authMiddleware);
router.get('/dashboard', checkRole(['admin']), AnalyticsController.getDashboard);

export default router;
