import { Router } from 'express';
import * as JobController from '../controllers/job.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/sms', JobController.enqueueSmsJob);
router.get('/sms/:id', JobController.getSmsJobStatus);

router.post('/backup', requireRole('admin'), JobController.enqueueBackupJob);
router.get('/backup/:id', requireRole('admin'), JobController.getBackupJobStatus);

export default router;
