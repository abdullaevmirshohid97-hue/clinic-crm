import { Router } from 'express';
import { MarketingController } from '../controllers/marketing.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendBulkSMSSchema } from '../utils/schemas';

const router = Router();

router.use(authMiddleware);
router.post('/bulk-sms', checkRole(['admin']), validate(sendBulkSMSSchema), MarketingController.sendBulkSMS);

export default router;
