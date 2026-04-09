import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    clinic_id: string;
    role: string;
  };
}
