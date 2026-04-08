import { Request, Response, NextFunction } from 'express';
import * as ClinicService from '../services/clinic.service';
import { updateClinicSchema } from '../utils/validators';
import { AuthenticatedRequest } from '../types';

export async function getClinic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    const clinic = await ClinicService.getClinic(clinic_id);
    res.status(200).json({ success: true, data: clinic });
  } catch (err) {
    next(err);
  }
}

export async function updateClinic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    const input = updateClinicSchema.parse(req.body);
    const clinic = await ClinicService.updateClinic(clinic_id, input);
    res.status(200).json({ success: true, data: clinic });
  } catch (err) {
    next(err);
  }
}
