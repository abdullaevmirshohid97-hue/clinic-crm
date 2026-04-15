import { Router, RequestHandler } from 'express';
import { PatientController } from './patient.controller';
import { authMiddleware } from '../../middleware/auth';
import { allowRoles } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate';
import { createPatientSchema, updatePatientSchema } from './patient.schema';

const router = Router();

router.use(authMiddleware as RequestHandler);

// View patients (admin, doctor own, nurse view)
router.get('/', allowRoles('admin', 'super_admin', 'doctor', 'nurse') as RequestHandler, PatientController.getPatients as RequestHandler);
router.get('/:id', allowRoles('admin', 'super_admin', 'doctor', 'nurse') as RequestHandler, PatientController.getPatientById as RequestHandler);

// Create / Update (admin, doctor — not nurse)
router.post('/', allowRoles('admin', 'super_admin', 'doctor') as RequestHandler, validate(createPatientSchema), PatientController.createPatient as RequestHandler);
router.put('/:id', allowRoles('admin', 'super_admin', 'doctor') as RequestHandler, validate(updatePatientSchema), PatientController.updatePatient as RequestHandler);

export default router;
