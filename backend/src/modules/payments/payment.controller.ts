import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { PaymentService } from './payment.service';

export class PaymentController {
  static async unlockProviders(req: AuthenticatedRequest, res: Response) {
    try {
      const clinicId = req.user!.clinic_id;
      const pin = String(req.body?.pin || '');
      const valid = await PaymentService.verifyPin(clinicId, pin);
      if (!valid) {
        return res.status(403).json({ success: false, error: "Noto'g'ri PIN kod" });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
  }

  static async setProvidersPin(req: AuthenticatedRequest, res: Response) {
    try {
      const clinicId = req.user!.clinic_id;
      const pin = String(req.body?.pin || '');
      await PaymentService.setPin(clinicId, pin);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
  }

  static async getProviders(req: AuthenticatedRequest, res: Response) {
    try {
      const clinicId = req.user!.clinic_id;
      const providers = await PaymentService.getProviders(clinicId);
      return res.json({ success: true, data: providers });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
  }

  static async saveProviders(req: AuthenticatedRequest, res: Response) {
    try {
      const clinicId = req.user!.clinic_id;
      const pin = String(req.body?.pin || '');
      const providers = Array.isArray(req.body?.providers) ? req.body.providers : [];
      const valid = await PaymentService.verifyPin(clinicId, pin);
      if (!valid) {
        return res.status(403).json({ success: false, error: "Noto'g'ri PIN kod" });
      }
      await PaymentService.saveProviders(clinicId, providers);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Server error' });
    }
  }
}
