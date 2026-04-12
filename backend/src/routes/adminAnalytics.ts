import { Router } from 'express';
import { tenantAuthMiddleware } from '../middleware/tenantAuth';
import { createClient } from '@supabase/supabase-js';

const router = Router();

router.get('/global', tenantAuthMiddleware, async (req, res) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access restricted to global admins' });
  }

  // Use Auth Header strictly for RLS binding over the internal RPC execution
  const authSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: req.headers.authorization! } }
  });

  try {
    const { data, error } = await authSupabase.rpc('get_global_analytics');
    if (error) {
       console.error("DB Global Analytics RPC Error:", error);
       throw error;
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: 'Database aggregation error' });
  }
});

export default router;
