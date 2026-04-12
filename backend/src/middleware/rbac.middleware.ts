import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Role } from '../types/express';

/**
 * Role Hierarchy: super_admin > admin > doctor > nurse > reception
 * A higher-level role automatically inherits lower-level access.
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 100,
  admin: 80,
  warehouse_manager: 70,
  doctor: 60,
  cashier: 50,
  nurse: 40,
  reception: 20,
};

/**
 * Allow access if the user's role is in the allowed list.
 * Uses hierarchy: if user's role level >= highest required level, access is granted.
 */
export const allowRoles = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const hasDirectRole = roles.includes(user.role);
    // Hierarchy: super_admin can always access everything
    const hasHierarchyAccess = userLevel >= ROLE_HIERARCHY.super_admin;

    if (!hasDirectRole && !hasHierarchyAccess) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient role' });
    }

    next();
  };
};

/**
 * Permission-based access control (granular).
 * Checks if user.permissions array includes the required permission.
 */
export const allowPermissions = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userPerms = user.permissions ?? [];
    const hasAll = permissions.every(p => userPerms.includes(p));

    if (!hasAll) {
      return res.status(403).json({ success: false, error: 'Forbidden: Missing permission' });
    }

    next();
  };
};

/**
 * Service-level role assertion (for double-check in services).
 * Throws an error if the user doesn't have the required role.
 */
export const assertRole = (userRole: Role, ...allowedRoles: Role[]): void => {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
  const hasDirectRole = allowedRoles.includes(userRole);
  const hasHierarchyAccess = userLevel >= ROLE_HIERARCHY.super_admin;

  if (!hasDirectRole && !hasHierarchyAccess) {
    throw new Error('Forbidden: Insufficient role for this operation');
  }
};

export { ROLE_HIERARCHY };
