import { Router } from 'express';
import { LabController } from '../controllers/lab.controller';
import { authMiddleware, checkRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateLabStatusSchema } from '../utils/schemas';

const router = Router();

router.use(authMiddleware);
router.put('/tests/:testId/status', checkRole(['admin', 'doctor', 'nurse']), validate(updateLabStatusSchema), LabController.updateStatus);

export default router;
