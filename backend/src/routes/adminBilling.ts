import { Router } from 'express';
import { tenantAuthMiddleware } from '../middleware/tenantAuth';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Guard: all routes super_admin only
router.use(tenantAuthMiddleware, (req, res, next) => {
  if (req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
});

// GET /api/admin/billing — All clinics with billing info
router.get('/', async (_req, res) => {
  try {
    const { data: clinics, error: cErr } = await supabaseAdmin
      .from('clinics')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false });

    if (cErr) throw cErr;

    const enriched = await Promise.all((clinics || []).map(async (clinic: any) => {
      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('id, status, amount, current_period_start, current_period_end, plan_id, max_doctors, max_patients, plans(name, price)')
        .eq('clinic_id', clinic.id)
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: doctorsCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id)
        .eq('role', 'doctor');

      const { count: patientsCount } = await supabaseAdmin
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinic.id);

      return {
        ...clinic,
        subscription: sub,
        doctors_count: doctorsCount || 0,
        patients_count: patientsCount || 0,
      };
    }));

    res.json(enriched);
  } catch (err: any) {
    console.error('Billing GET error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/subscription/activate
router.post('/subscription/activate', async (req, res) => {
  try {
    const { clinic_id, plan_id, duration_days } = req.body;
    if (!clinic_id || !plan_id || !duration_days) {
      return res.status(400).json({ error: 'clinic_id, plan_id, duration_days required' });
    }

    // Expire old
    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('clinic_id', clinic_id)
      .in('status', ['active', 'trial']);

    // Fetch plan
    const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', plan_id).single();
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const start = new Date();
    const end = new Date(start.getTime() + duration_days * 86400000);

    const { error } = await supabaseAdmin.from('subscriptions').insert({
      clinic_id,
      plan_id,
      status: 'active',
      amount: plan.price,
      max_doctors: plan.max_doctors,
      max_patients: plan.max_patients,
      current_period_start: start.toISOString(),
      current_period_end: end.toISOString(),
    });

    if (error) throw error;

    // Ensure clinic status is active
    await supabaseAdmin.from('clinics').update({ status: 'active' }).eq('id', clinic_id);

    res.json({ success: true, message: 'Subscription activated' });
  } catch (err: any) {
    console.error('Activate error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/subscription/extend
router.post('/subscription/extend', async (req, res) => {
  try {
    const { clinic_id, days } = req.body;
    if (!clinic_id || !days) return res.status(400).json({ error: 'clinic_id, days required' });

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id, current_period_end')
      .eq('clinic_id', clinic_id)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return res.status(404).json({ error: 'No subscription found' });

    const currentEnd = new Date(sub.current_period_end);
    const base = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    const newEnd = new Date(base.getTime() + days * 86400000);

    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({ current_period_end: newEnd.toISOString(), status: 'active' })
      .eq('id', sub.id);

    if (error) throw error;
    res.json({ success: true, message: 'Subscription extended' });
  } catch (err: any) {
    console.error('Extend error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/subscription/block
router.post('/subscription/block', async (req, res) => {
  try {
    const { clinic_id } = req.body;
    if (!clinic_id) return res.status(400).json({ error: 'clinic_id required' });

    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'blocked' })
      .eq('clinic_id', clinic_id)
      .in('status', ['active', 'trial']);

    res.json({ success: true, message: 'Clinic blocked' });
  } catch (err: any) {
    console.error('Block error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/subscription/unblock
router.post('/subscription/unblock', async (req, res) => {
  try {
    const { clinic_id } = req.body;
    if (!clinic_id) return res.status(400).json({ error: 'clinic_id required' });

    const newEnd = new Date(Date.now() + 30 * 86400000);

    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('clinic_id', clinic_id)
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) return res.status(404).json({ error: 'No subscription found' });

    await supabaseAdmin
      .from('subscriptions')
      .update({ status: 'active', current_period_end: newEnd.toISOString() })
      .eq('id', sub.id);

    res.json({ success: true, message: 'Clinic unblocked, extended 30 days' });
  } catch (err: any) {
    console.error('Unblock error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/billing/plans
router.get('/plans', async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('plans').select('*').order('price', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('Plans GET error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
