import { Response } from 'express';
import { MarketingService } from '../services/marketingService';
import { AuthenticatedRequest } from '../types/express';

export class MarketingController {
  static async sendBulkSMS(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { segment, message } = req.body;
      
      const queuedCount = await MarketingService.sendBulkSMS(user.clinic_id, segment, message);

      res.json({ success: true, message: `Successfully queued ${queuedCount} SMS messages.` });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error' });
    }
  }
}
