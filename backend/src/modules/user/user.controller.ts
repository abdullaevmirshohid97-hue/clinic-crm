import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { UserService } from './user.service';
import { sendSuccess, sendError } from '../../utils/response';

export class UserController {
  static async getStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const staff = await UserService.getAllStaff(user.clinic_id);
      sendSuccess(res, staff);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 500);
    }
  }

  static async createStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const staff = await UserService.addStaff(user.clinic_id, user.id, req.body);
      sendSuccess(res, staff, 201);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async updateStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const staff = await UserService.updateStaff(id as string, user.clinic_id, req.body);
      sendSuccess(res, staff);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async deleteStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      await UserService.deleteStaff(id as string, user.clinic_id, user.id);
      sendSuccess(res, { message: 'Staff deleted successfully' });
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async heartbeat(req: AuthenticatedRequest, res: Response) {
    try {
      await UserService.updateHeartbeat(req.user!.id);
      sendSuccess(res, null);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 500);
    }
  }
}
