import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { QueueService } from './queue.service';
import { sendSuccess, sendError, sendPaginated, parsePagination } from '../../utils/response';

export class QueueController {
  // Get queue by date (for Queue page)
  static async getByDate(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const data = await QueueService.getQueueByDate(user.clinic_id, date);
      sendSuccess(res, data);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  // Get doctors for queue selection
  static async getDoctors(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const data = await QueueService.getDoctors(user.clinic_id);
      sendSuccess(res, data);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  // Add to queue
  static async addToQueue(req: AuthenticatedRequest, res: Response) {
    try {
      const { patientId, doctorId, patientName } = req.body;
      const user = req.user!;
      const queueEntry = await QueueService.addToQueue(
        user.clinic_id, 
        patientId || null, 
        doctorId, 
        patientName
      );
      sendSuccess(res, queueEntry, 201);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  // Update status
  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const user = req.user!;
      const updated = await QueueService.updateStatus(user.clinic_id, id, status);
      sendSuccess(res, updated);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  // Get queue by doctor (for doctor panel)
  static async getQueue(req: AuthenticatedRequest, res: Response) {
    try {
      const doctorId = req.params.doctorId as string;
      const user = req.user!;
      const { limit, offset } = parsePagination(req.query as any);
      const { data, total } = await QueueService.getQueueByDoctor(user.clinic_id, doctorId, limit, offset);
      sendPaginated(res, data, total, limit, offset);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  // Call next patient
  static async callNext(req: AuthenticatedRequest, res: Response) {
    try {
      const { doctorId } = req.body;
      const user = req.user!;
      const nextPatient = await QueueService.callNext(user.clinic_id, doctorId);
      if (!nextPatient) {
        return sendSuccess(res, { message: 'No waiting patients', data: null });
      }
      sendSuccess(res, nextPatient);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  // Complete queue entry
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
