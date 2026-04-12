import { Router } from 'express';
import { MarketingController } from './marketing.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { sendBulkSMSSchema } from './marketing.schema';

const router = Router();

router.use(authMiddleware);
router.post('/bulk-sms', allowRoles('admin', 'super_admin'), validate(sendBulkSMSSchema), MarketingController.sendBulkSMS);

export default router;
