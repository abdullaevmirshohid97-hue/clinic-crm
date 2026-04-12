import { Router } from 'express';
import { LabController } from './lab.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { updateLabStatusSchema } from './lab.schema';
import { requireFeature } from '../../middleware/featureFlag.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireFeature('lab'));

router.put('/tests/:testId/status', allowRoles('admin', 'super_admin', 'doctor', 'nurse'), validate(updateLabStatusSchema), LabController.updateStatus);

export default router;
