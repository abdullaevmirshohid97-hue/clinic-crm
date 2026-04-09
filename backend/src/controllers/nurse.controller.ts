import { Response } from 'express';
import { NurseService } from '../services/nurseService';
import { AuthenticatedRequest } from '../types/express';

export class NurseController {
  static async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const clinicId = req.user!.clinic_id;
      const { roomId, doctorId } = req.query;
      
      const dashboardData = await NurseService.getDashboardData(clinicId, {
        roomId: roomId as string,
        doctorId: doctorId as string,
      });

      res.json({ success: true, data: dashboardData });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
