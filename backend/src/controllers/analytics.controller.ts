import { Response } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { AuthenticatedRequest } from '../types/express';

export class AnalyticsController {
  static async getDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const clinicId = req.user!.clinic_id;
      const stats = await AnalyticsService.getDashboardStats(clinicId);
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
