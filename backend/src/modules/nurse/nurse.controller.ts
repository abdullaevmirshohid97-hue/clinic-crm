import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { NurseService } from './nurse.service';
import { sendSuccess, sendError } from '../../utils/response';

export class NurseController {
  static async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const clinicId = req.user!.clinic_id;
      const { roomId, doctorId } = req.query;
      const dashboardData = await NurseService.getDashboardData(clinicId, {
        roomId: roomId as string,
        doctorId: doctorId as string,
      });
      sendSuccess(res, dashboardData);
    } catch (err: any) {
      sendError(res, err.message, 500);
    }
  }
}
