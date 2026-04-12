import { Request, Response, NextFunction } from 'express';
import { PurchaseService } from './purchase.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types/express';

export class PurchaseController {
  static async processFactura(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const result = await PurchaseService.processPurchaseFlow(user, req.body);
      sendSuccess(res, result);
    } catch (e) {
      next(e);
    }
  }
}
