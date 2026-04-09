import { Router } from 'express';
import queueRoutes from './queue.routes';
import roomRoutes from './room.routes';
import patientRoutes from './patient.routes';
import userRoutes from './user.routes';
import analyticsRoutes from './analytics.routes';
import nurseRoutes from './nurse.routes';
import labRoutes from './lab.routes';
import marketingRoutes from './marketing.routes';

const router = Router();

router.use('/queue', queueRoutes);
router.use('/rooms', roomRoutes);
router.use('/patients', patientRoutes);
router.use('/users', userRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/nurse', nurseRoutes);
router.use('/lab', labRoutes);
router.use('/marketing', marketingRoutes);

export default router;
