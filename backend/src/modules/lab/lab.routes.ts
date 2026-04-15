import { Router, RequestHandler } from 'express';
import { LabController } from './lab.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { updateLabStatusSchema } from './lab.schema';
import { requireFeature } from '../../middleware/featureFlag.middleware';

const router = Router();

router.use(authMiddleware as RequestHandler);
router.use(requireFeature('lab') as RequestHandler);

router.put('/tests/:testId/status', allowRoles('admin', 'super_admin', 'doctor', 'nurse') as RequestHandler, validate(updateLabStatusSchema), LabController.updateStatus as RequestHandler);

export default router;
