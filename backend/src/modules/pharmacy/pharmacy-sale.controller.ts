import { Request, Response, NextFunction } from 'express';
import { PharmacySaleService } from './pharmacy-sale.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types/express';

export class PharmacySaleController {
  static async getInpatients(req: Request, res: Response, next: NextFunction) {
    try {
      const clinicId = (req as AuthenticatedRequest).user!.clinic_id;
      const data = await PharmacySaleService.getActiveInpatients(clinicId);
      sendSuccess(res, data);
    } catch (e) {
      next(e);
    }
  }

  static async processSale(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const result = await PharmacySaleService.processSale(user, req.body);
      sendSuccess(res, result);
    } catch (e) {
      next(e);
    }
  }
}
