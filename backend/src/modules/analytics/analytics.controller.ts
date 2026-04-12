import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { AnalyticsService } from './analytics.service';
import { sendSuccess, sendError } from '../../utils/response';

export class AnalyticsController {
  static async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const clinicId = req.user!.clinic_id;
      const stats = await AnalyticsService.getDashboardStats(clinicId);
      sendSuccess(res, stats);
    } catch (err: any) {
      sendError(res, err.message, 500);
    }
  }
}
