import { Request, Response, NextFunction } from 'express';
import { SupplierService } from './supplier.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types/express';

export class SupplierController {
  static async getSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const clinicId = (req as AuthenticatedRequest).user!.clinic_id;
      const data = await SupplierService.getSuppliers(clinicId);
      sendSuccess(res, data);
    } catch (e) {
      next(e);
    }
  }

  static async addSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as AuthenticatedRequest).user!;
      const data = await SupplierService.addSupplier(user, req.body);
      sendSuccess(res, data, 201);
    } catch (e) {
      next(e);
    }
  }
}
