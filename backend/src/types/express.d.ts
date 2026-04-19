import { Request } from 'express';

export type Role = 'super_admin' | 'admin' | 'doctor' | 'nurse' | 'reception' | 'warehouse_manager' | 'cashier';

export interface UserPayload {
  id: string;
  clinic_id: string;
  role: Role;
  permissions?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export type AuthenticatedRequest = Request;

export interface PaginationQuery {
  limit?: string;
  offset?: string;
}
