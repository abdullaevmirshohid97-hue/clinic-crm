import { Response } from 'express';
import { QueueService } from '../services/queueService';
import { AuthenticatedRequest } from '../types/express';

export class QueueController {
  static async addToQueue(req: AuthenticatedRequest, res: Response) {
    try {
      const { patientId, doctorId, doctorPrefix } = req.body;
      const user = req.user!;

      const queueEntry = await QueueService.addToQueue(user.clinic_id, patientId, doctorId, doctorPrefix);
      res.status(201).json({ success: true, data: queueEntry });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async getQueue(req: AuthenticatedRequest, res: Response) {
    try {
      const { doctorId } = req.params;
      const user = req.user!;

      const queues = await QueueService.getQueueByDoctor(user.clinic_id, doctorId as string);
      res.json({ success: true, data: queues });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async callNext(req: AuthenticatedRequest, res: Response) {
    try {
      const { doctorId } = req.body;
      const user = req.user!;

      const nextPatient = await QueueService.callNext(user.clinic_id, doctorId);
      
      if (!nextPatient) {
        return res.json({ success: true, message: 'No waiting patients' });
      }

      res.json({ success: true, data: nextPatient });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }

  static async complete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const completed = await QueueService.complete(user.clinic_id, id as string);
      res.json({ success: true, data: completed });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Error' });
    }
  }
}
