import { Router, RequestHandler } from 'express';
import { MarketingController } from './marketing.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { sendBulkSMSSchema } from './marketing.schema';

const router = Router();

router.use(authMiddleware as RequestHandler);
router.post('/bulk-sms', allowRoles('admin', 'super_admin') as RequestHandler, validate(sendBulkSMSSchema), MarketingController.sendBulkSMS as RequestHandler);

export default router;
