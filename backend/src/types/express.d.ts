import { Request } from 'express';

export type Role = 'super_admin' | 'admin' | 'doctor' | 'nurse' | 'reception' | 'warehouse_manager' | 'cashier';

export interface UserPayload {
  id: string;
  clinic_id: string;
  role: Role;
  permissions?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export interface PaginationQuery {
  limit?: string;
  offset?: string;
}
