import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { supabase } from '../config/supabase';
import logger from '../config/logger';

// In-memory cache for feature flags per clinic
const featureFlagCache = new Map<string, { flags: Record<string, boolean>; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch feature flags for a clinic (with caching).
 */
async function getClinicFeatures(clinicId: string): Promise<Record<string, boolean>> {
  const cached = featureFlagCache.get(clinicId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.flags;
  }

  try {
    const { data, error } = await supabase
      .from('clinic_features')
      .select('feature, enabled')
      .eq('clinic_id', clinicId);

    if (error) {
      logger.error({ error, clinicId }, 'Failed to fetch feature flags');
      return {}; // Fail open — allow access if DB fails
    }

    const flags: Record<string, boolean> = {};
    (data || []).forEach(row => {
      flags[row.feature] = row.enabled;
    });

    featureFlagCache.set(clinicId, { flags, expiresAt: Date.now() + CACHE_TTL_MS });
    return flags;
  } catch (err) {
    logger.error({ err, clinicId }, 'Feature flag fetch exception');
    return {};
  }
}

/**
 * Middleware: require a specific feature to be enabled for the clinic.
 * Usage: requireFeature('pharmacy')
 */
export const requireFeature = (feature: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const flags = await getClinicFeatures(user.clinic_id);

    // If the feature flag table/row doesn't exist yet, allow access (fail open)
    if (flags[feature] === false) {
      return res.status(403).json({
        success: false,
        error: `Module "${feature}" is not enabled for your clinic.`,
      });
    }

    next();
  };
};

/**
 * Clear cache for a specific clinic (e.g., after admin changes features).
 */
export function clearFeatureFlagCache(clinicId?: string): void {
  if (clinicId) {
    featureFlagCache.delete(clinicId);
  } else {
    featureFlagCache.clear();
  }
}
