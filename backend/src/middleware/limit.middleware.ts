import { Request, Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscriptionService';

export const limitMiddleware = (resource: 'doctor' | 'patient') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user?.role === 'super_admin') return next();

      const sub = (req as any).subscription;
      const svc: SubscriptionService = (req as any).subscriptionService;

      if (!sub || !svc) {
        return res.status(500).json({ error: 'Subscription context missing' });
      }

      const clinicId = req.user?.clinic_id;
      if (!clinicId) return res.status(403).json({ error: 'Clinic identity missing' });

      if (resource === 'doctor') {
        const max = SubscriptionService.getMaxDoctors(sub);
        if (max === null) return res.status(500).json({ error: 'Invalid plan configuration: doctor limit undefined' });
        const allowed = await svc.canAddDoctor(clinicId, max);
        if (!allowed) return res.status(403).json({ error: "Doctor limit reached (" + max + ")" });
      }

      if (resource === 'patient') {
        const max = SubscriptionService.getMaxPatients(sub);
        if (max === null) return res.status(500).json({ error: 'Invalid plan configuration: patient limit undefined' });
        const allowed = await svc.canAddPatient(clinicId, max);
        if (!allowed) return res.status(403).json({ error: "Patient limit reached (" + max + ")" });
      }

      next();
    } catch (err) {
      console.error('limitMiddleware error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
