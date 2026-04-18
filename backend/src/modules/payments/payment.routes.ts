import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { PaymentController } from './payment.controller';

const router = Router();

router.use(authMiddleware as RequestHandler);

router.post(
  '/providers/unlock',
  allowRoles('super_admin', 'admin') as RequestHandler,
  PaymentController.unlockProviders as RequestHandler
);
router.post(
  '/providers/pin',
  allowRoles('super_admin', 'admin') as RequestHandler,
  PaymentController.setProvidersPin as RequestHandler
);
router.get(
  '/providers',
  allowRoles('super_admin', 'admin', 'reception', 'cashier', 'doctor', 'nurse') as RequestHandler,
  PaymentController.getProviders as RequestHandler
);
router.put(
  '/providers',
  allowRoles('super_admin', 'admin') as RequestHandler,
  PaymentController.saveProviders as RequestHandler
);

export default router;
