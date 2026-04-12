import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client with Anon Key specifically for validation verification
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Define custom user type on Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        clinic_id?: string;
        role?: string;
      };
    }
  }
}

/**
 * Validates Supabase JWT, retrieves strictly verified user session, and enforces tenant isolation constraints.
 */
export const tenantAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided via Bearer header.' });
    }

    const token = authHeader.split(' ')[1];

    // Offload validation safely to Supabase (Decodes & validates signature + expiration natively)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired auth session', details: error?.message });
    }

    // Attach verified user and custom claims to Request locally
    req.user = {
      user_id: user.id,
      clinic_id: user.app_metadata?.clinic_id,
      role: user.app_metadata?.role
    };

    // Strict Tenant Isolation Logic
    // If not super_admin, they MUST have an explicitly assigned clinic ID in JWT claims.
    if (req.user.role !== 'super_admin' && !req.user.clinic_id) {
      return res.status(403).json({ 
        error: 'Clinic context not assigned. User lacks required multi-tenant identity.' 
      });
    }

    next();
  } catch (error) {
    console.error('Auth Middleware Exception:', error);
    res.status(500).json({ error: 'Internal server error while processing authentication' });
  }
};
