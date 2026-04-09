import { Response } from 'express';
import { LabService } from '../services/labService';
import { AuthenticatedRequest } from '../types/express';

export class LabController {
  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { testId } = req.params;
      const { status, resultDetails } = req.body;
      
      const test = await LabService.updateTestStatus(user.clinic_id, testId as string, status, resultDetails);
      res.json({ success: true, data: test });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Server error' });
    }
  }
}
