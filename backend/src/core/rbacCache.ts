import logger from '../config/logger';
import { Role } from '../types/express';

interface CachedUserRBAC {
  role: Role;
  permissions: string[];
  expiresAt: number;
}

const cache = new Map<string, CachedUserRBAC>();

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Get cached RBAC data for a user.
 */
export function getCachedRBAC(userId: string): CachedUserRBAC | null {
  const entry = cache.get(userId);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(userId);
    return null;
  }

  return entry;
}

/**
 * Set RBAC cache for a user.
 */
export function setCachedRBAC(userId: string, role: Role, permissions: string[], ttlMs = DEFAULT_TTL_MS): void {
  cache.set(userId, {
    role,
    permissions,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Invalidate cache for a specific user (e.g., after role change).
 */
export function invalidateRBACCache(userId?: string): void {
  if (userId) {
    cache.delete(userId);
  } else {
    cache.clear();
    logger.info('RBAC cache fully cleared');
  }
}

/**
 * Get cache stats (for monitoring).
 */
export function getRBACCacheStats(): { size: number } {
  return { size: cache.size };
}
