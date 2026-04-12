import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { PatientService } from './patient.service';
import { sendSuccess, sendError, sendPaginated, parsePagination } from '../../utils/response';

export class PatientController {
  static async getPatients(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { limit, offset } = parsePagination(req.query as any);
      const { data, total } = await PatientService.getPatients(user, limit, offset);
      sendPaginated(res, data, total, limit, offset);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 500);
    }
  }

  static async getPatientById(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const patient = await PatientService.getPatientById(user, id as string);
      sendSuccess(res, patient);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 404);
    }
  }

  static async createPatient(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const patient = await PatientService.createPatient(user, req.body);
      sendSuccess(res, patient, 201);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }

  static async updatePatient(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const patient = await PatientService.updatePatient(user, id as string, req.body);
      sendSuccess(res, patient);
    } catch (err: any) {
      sendError(res, err.message || 'Error', 400);
    }
  }
}
