import { Request, Response, NextFunction, RequestHandler } from 'express';

export type Role = 'super_admin' | 'admin' | 'doctor' | 'nurse' | 'reception' | 'warehouse_manager' | 'cashier';

export interface UserPayload {
  id: string;
  user_id?: string;
  clinic_id: string;
  role: Role;
  permissions?: string[];
}

export interface PaginationQuery {
  limit?: string;
  offset?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response> | void | Response;
