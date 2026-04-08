import { Router } from 'express';
import * as PatientController from '../controllers/patient.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', PatientController.listPatients);
router.post('/', PatientController.createPatient);
router.get('/:id', PatientController.getPatient);
router.patch('/:id', PatientController.updatePatient);
router.delete('/:id', PatientController.deletePatient);

export default router;
