import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { LabService } from './lab.service';
import { sendSuccess, sendError } from '../../utils/response';

export class LabController {
  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { testId } = req.params;
      const { status, resultDetails } = req.body;
      const test = await LabService.updateTestStatus(user.clinic_id, testId as string, status, resultDetails);
      sendSuccess(res, test);
    } catch (err: any) {
      sendError(res, err.message || 'Server error', 500);
    }
  }
}
