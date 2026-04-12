import { Router } from 'express';
import { PatientController } from './patient.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { createPatientSchema, updatePatientSchema } from './patient.schema';

const router = Router();

router.use(authMiddleware);

// View patients (admin, doctor own, nurse view)
router.get('/', allowRoles('admin', 'super_admin', 'doctor', 'nurse'), PatientController.getPatients);
router.get('/:id', allowRoles('admin', 'super_admin', 'doctor', 'nurse'), PatientController.getPatientById);

// Create / Update (admin, doctor — not nurse)
router.post('/', allowRoles('admin', 'super_admin', 'doctor'), validate(createPatientSchema), PatientController.createPatient);
router.put('/:id', allowRoles('admin', 'super_admin', 'doctor'), validate(updatePatientSchema), PatientController.updatePatient);

export default router;
