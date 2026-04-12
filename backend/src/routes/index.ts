import { Router } from 'express';
import queueRoutes from '../modules/queue/queue.routes';
import roomRoutes from '../modules/room/room.routes';
import patientRoutes from '../modules/patient/patient.routes';
import userRoutes from '../modules/user/user.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import nurseRoutes from '../modules/nurse/nurse.routes';
import labRoutes from '../modules/lab/lab.routes';
import marketingRoutes from '../modules/marketing/marketing.routes';
import pharmacyRoutes from '../modules/pharmacy/pharmacy.routes';

const router = Router();

router.use('/queue', queueRoutes);
router.use('/rooms', roomRoutes);
router.use('/patients', patientRoutes);
router.use('/users', userRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/nurse', nurseRoutes);
router.use('/lab', labRoutes);
router.use('/marketing', marketingRoutes);
router.use('/pharmacy', pharmacyRoutes);

export default router;
