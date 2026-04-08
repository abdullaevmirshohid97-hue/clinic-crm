import { Request, Response, NextFunction } from 'express';
import * as PatientService from '../services/patient.service';
import { createPatientSchema, updatePatientSchema, paginationSchema } from '../utils/validators';
import { AuthenticatedRequest } from '../types';

export async function listPatients(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    const { page, limit } = paginationSchema.parse(req.query);
    const { patients, total } = await PatientService.listPatients(clinic_id, { page, limit });

    res.status(200).json({
      success: true,
      data: patients,
      total,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPatient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    const patient = await PatientService.getPatient(clinic_id, req.params.id);
    res.status(200).json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

export async function createPatient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    const input = createPatientSchema.parse(req.body);
    const patient = await PatientService.createPatient(clinic_id, input);
    res.status(201).json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

export async function updatePatient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    const input = updatePatientSchema.parse(req.body);
    const patient = await PatientService.updatePatient(clinic_id, req.params.id, input);
    res.status(200).json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
}

export async function deletePatient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    await PatientService.deletePatient(clinic_id, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
