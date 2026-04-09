import { Router } from 'express';
import { NurseController } from '../controllers/nurse.controller';
import { authMiddleware, checkRole } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/dashboard', checkRole(['admin', 'nurse', 'doctor']), NurseController.getDashboard);

export default router;
