import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest, Role } from '../types/express';
import { getCachedRBAC, setCachedRBAC } from '../core/rbacCache';
import logger from '../config/logger';

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (process.env.NODE_ENV === 'test') {
    const testRole = req.headers['x-test-role'];

    if (typeof testRole === 'string' && testRole.length > 0) {
      const testPermissions = req.headers['x-test-permissions'];
      const permissions = typeof testPermissions === 'string' && testPermissions.length > 0
        ? testPermissions.split(',').map((p) => p.trim()).filter(Boolean)
        : [];

      req.user = {
        id: (req.headers['x-test-user-id'] as string) || 'test-user-id',
        clinic_id: (req.headers['x-test-clinic-id'] as string) || 'test-clinic-id',
        role: testRole as Role,
        permissions,
      };
      return next();
    }
  }

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    // Check RBAC cache first
    const cached = getCachedRBAC(user.id);
    if (cached) {
      req.user = {
        id: user.id,
        clinic_id: '', // Will be overridden below if needed
        role: cached.role,
        permissions: cached.permissions,
      };

      // Still need clinic_id from DB since it's not in cache
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return res.status(403).json({ success: false, error: 'Forbidden: User profile not found' });
      }

      req.user.clinic_id = profile.clinic_id;
      return next();
    }

    // No cache — fetch full profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('clinic_id, role, permissions')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ success: false, error: 'Forbidden: User profile not found' });
    }

    const role = profile.role as Role;
    const permissions: string[] = profile.permissions ?? [];

    // Cache for next requests
    setCachedRBAC(user.id, role, permissions);

    req.user = {
      id: user.id,
      clinic_id: profile.clinic_id,
      role,
      permissions,
    };

    next();
  } catch (err) {
    logger.error(err, 'Auth Middleware Error');
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

/**
 * @deprecated Use allowRoles from rbac.middleware.ts instead.
 * Kept for backward compatibility during migration.
 */
export const checkRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};
