import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { MarketingService } from './marketing.service';
import { sendSuccess, sendError } from '../../utils/response';

export class MarketingController {
  static async sendBulkSMS(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { segment, message } = req.body;
      const queuedCount = await MarketingService.sendBulkSMS(user.clinic_id, segment, message);
      sendSuccess(res, { queued: queuedCount, message: `Successfully queued ${queuedCount} SMS messages.` });
    } catch (err: any) {
      sendError(res, err.message || 'Error', 500);
    }
  }
}
