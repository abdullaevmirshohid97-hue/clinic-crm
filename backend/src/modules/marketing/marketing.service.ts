import { supabase } from '../../config/supabase';
import { smsQueue } from '../../config/queue';

export class MarketingService {
  static async sendBulkSMS(clinicId: string, segment: 'all' | 'active' | 'archive' | 'debtors', message: string) {
    let query = supabase.from('patients').select('id, phone').eq('clinic_id', clinicId);

    // Segment filtering placeholder
    // if (segment === 'active') { ... }
    // if (segment === 'debtors') { ... }

    const { data: patients, error } = await query;
    if (error) throw error;
    if (!patients || patients.length === 0) return 0;

    const jobs = patients
      .filter((p) => p.phone)
      .map((p) => ({
        name: 'marketing-sms',
        data: { clinicId, patientId: p.id, phone: p.phone, message },
        opts: { attempts: 3, backoff: { type: 'exponential' as const, delay: 2000 } },
      }));

    await smsQueue.addBulk(jobs);
    return jobs.length;
  }
}
