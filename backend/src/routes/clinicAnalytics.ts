import { Router } from 'express';
import { tenantAuthMiddleware } from '../middleware/tenantAuth';
import { createClient } from '@supabase/supabase-js';

const router = Router();

router.get('/', tenantAuthMiddleware, async (req, res) => {
  if (!req.user?.clinic_id && req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Invalid tenant parameter' });
  }

  // Set Auth Header strictly to enforce native RPC 'SECURITY INVOKER'
  const authSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: req.headers.authorization! } }
  });

  try {
    const { data, error } = await authSupabase.rpc('get_clinic_analytics');
    
    if (error) {
       console.error("DB Clinic Analytics RPC Error:", error);
       throw error;
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Database aggregation error' });
  }
});

export default router;
