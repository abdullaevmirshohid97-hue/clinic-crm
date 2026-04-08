import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { redis } from '../config/redis';
import { supabase } from '../config/database';

const healthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.get('/', healthLimiter, async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {
    api: 'ok',
    redis: 'error',
    supabase: 'error',
  };

  // Redis check
  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  // Supabase check
  try {
    const { error } = await supabase.from('clinics').select('id').limit(1);
    checks.supabase = error ? 'error' : 'ok';
  } catch {
    checks.supabase = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
