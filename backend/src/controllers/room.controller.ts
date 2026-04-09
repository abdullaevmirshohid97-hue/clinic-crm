import { Response } from 'express';
import { RoomService } from '../services/roomService';
import { AuthenticatedRequest } from '../types/express';

export class RoomController {
  static async getRooms(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const rooms = await RoomService.getAllRooms(user.clinic_id);
      res.json({ success: true, data: rooms });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async getRoomDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const details = await RoomService.getRoomDetails(user.clinic_id, id as string);
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async assignPatient(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const assignment = await RoomService.assignPatient(user.clinic_id, req.body);
      res.status(201).json({ success: true, data: assignment });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async dischargePatient(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;
      const user = req.user!;
      const dischargedInfo = await RoomService.dischargePatient(user.clinic_id, assignmentId as string);
      res.json({ success: true, data: dischargedInfo });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }
}
