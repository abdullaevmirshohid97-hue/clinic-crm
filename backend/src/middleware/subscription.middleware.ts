import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscriptionService';

export const subscriptionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role === 'super_admin') return next();

    if (!req.user?.clinic_id) {
      return res.status(403).json({ error: 'Tenant identity required' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid auth header' });
    }

    const svc = new SubscriptionService(authHeader);
    const sub = await svc.getSubscription(req.user.clinic_id);

    if (!sub) return res.status(403).json({ error: 'No subscription found' });
    if (SubscriptionService.isBlocked(sub)) return res.status(403).json({ error: 'Clinic blocked by administration' });
    if (SubscriptionService.isExpired(sub)) return res.status(402).json({ error: 'Subscription expired. Payment required' });

    (req as any).subscription = sub;
    (req as any).subscriptionService = svc;
    next();
  } catch (err) {
    console.error('subscriptionMiddleware error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
