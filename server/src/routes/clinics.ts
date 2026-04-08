import { Router } from 'express';
import * as ClinicController from '../controllers/clinic.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', ClinicController.getClinic);
router.patch('/', requireRole('admin'), ClinicController.updateClinic);

export default router;
