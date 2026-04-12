import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { QueueService } from './queue.service';
import { sendSuccess, sendError, sendPaginated, parsePagination } from '../../utils/response';

export class QueueController {
  static async addToQueue(req: AuthenticatedRequest, res: Response) {
    try {
      const { patientId, doctorId, doctorPrefix } = req.body;
      const user = req.user!;
      const queueEntry = await QueueService.addToQueue(user.clinic_id, patientId, doctorId, doctorPrefix);
      sendSuccess(res, queueEntry, 201);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async getQueue(req: AuthenticatedRequest, res: Response) {
    try {
      const { doctorId } = req.params;
      const user = req.user!;
      const { limit, offset } = parsePagination(req.query as any);
      const { data, total } = await QueueService.getQueueByDoctor(user.clinic_id, doctorId as string, limit, offset);
      sendPaginated(res, data, total, limit, offset);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async callNext(req: AuthenticatedRequest, res: Response) {
    try {
      const { doctorId } = req.body;
      const user = req.user!;
      const nextPatient = await QueueService.callNext(user.clinic_id, doctorId);
      if (!nextPatient) {
        return sendSuccess(res, { message: 'No waiting patients' });
      }
      sendSuccess(res, nextPatient);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async complete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const completed = await QueueService.complete(user.clinic_id, id as string);
      sendSuccess(res, completed);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }
}
