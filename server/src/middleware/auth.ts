import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { AuthenticatedRequest, JwtPayload } from '../types';

/**
 * Validates the JWT token issued by Supabase and attaches
 * the decoded payload (including clinic_id) to req.user.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7);
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? '',
      clinic_id: (user.user_metadata?.clinic_id as string) ?? '',
      role: (user.user_metadata?.role as JwtPayload['role']) ?? 'receptionist',
      iat: 0,
      exp: 0,
    };

    if (!payload.clinic_id) {
      throw new ForbiddenError('User is not associated with a clinic');
    }

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Requires one of the specified roles.
 */
export function requireRole(...roles: JwtPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(user.role)) {
      next(new ForbiddenError(`Role '${user.role}' is not allowed`));
      return;
    }
    next();
  };
}
