import { Response } from 'express';
import { UserService } from '../services/userService';
import { AuthenticatedRequest } from '../types/express';

export class UserController {
  static async getStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const staff = await UserService.getAllStaff(user.clinic_id);
      res.json({ success: true, data: staff });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async createStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const staff = await UserService.addStaff(user.clinic_id, req.body);
      res.status(201).json({ success: true, data: staff });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async updateStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const staff = await UserService.updateStaff(id as string, user.clinic_id, req.body);
      res.json({ success: true, data: staff });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async deleteStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      await UserService.deleteStaff(id as string, user.clinic_id);
      res.json({ success: true, message: 'Staff deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async heartbeat(req: AuthenticatedRequest, res: Response) {
    try {
      await UserService.updateHeartbeat(req.user!.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error' });
    }
  }
}
