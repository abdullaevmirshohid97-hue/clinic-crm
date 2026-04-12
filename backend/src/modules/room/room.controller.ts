import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { RoomService } from './room.service';
import { sendSuccess, sendError, sendPaginated, parsePagination } from '../../utils/response';

export class RoomController {
  static async getRooms(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { limit, offset } = parsePagination(req.query as any);
      const { data, total } = await RoomService.getAllRooms(user.clinic_id, limit, offset);
      sendPaginated(res, data, total, limit, offset);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 500);
    }
  }

  static async getRoomDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const details = await RoomService.getRoomDetails(user.clinic_id, id as string);
      sendSuccess(res, details);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 500);
    }
  }

  static async assignPatient(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const assignment = await RoomService.assignPatient(user.clinic_id, req.body);
      sendSuccess(res, assignment, 201);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async dischargePatient(req: AuthenticatedRequest, res: Response) {
    try {
      const { assignmentId } = req.params;
      const user = req.user!;
      const dischargedInfo = await RoomService.dischargePatient(user.clinic_id, assignmentId as string);
      sendSuccess(res, dischargedInfo);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }
}
