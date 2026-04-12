import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { PharmacyService } from './pharmacy.service';
import { sendSuccess, sendError, sendPaginated, parsePagination } from '../../utils/response';

export class PharmacyController {
  static async getInventory(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { limit, offset } = parsePagination(req.query as any);
      const { data, total } = await PharmacyService.getInventory(user.clinic_id, limit, offset);
      sendPaginated(res, data, total, limit, offset);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 500);
    }
  }

  static async addMedicine(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const medicine = await PharmacyService.addMedicine(user, req.body);
      sendSuccess(res, medicine, 201);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async updateStock(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const result = await PharmacyService.updateStock(user, id as string, req.body);
      sendSuccess(res, result);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async deleteMedicine(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      await PharmacyService.deleteMedicine(user, id as string);
      sendSuccess(res, { message: 'Medicine deleted successfully' });
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }
}
