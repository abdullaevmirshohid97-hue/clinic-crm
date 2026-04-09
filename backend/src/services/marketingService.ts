import { supabase } from '../config/supabase';
import { smsQueue } from '../config/queue';

export class MarketingService {
  static async sendBulkSMS(clinicId: string, segment: 'all' | 'active' | 'archive' | 'debtors', message: string) {
    let query = supabase.from('patients').select('id, phone').eq('clinic_id', clinicId);

    // Depending on the segment, modify the query
    if (segment === 'active') {
      // Logic for active patients (e.g. recently visited or currently in a room)
      // query = query.in('id', activePatientIds)
    } else if (segment === 'archive') {
      // Logic for archived patients
    } else if (segment === 'debtors') {
      // Logic for debtors joining with debts table
    }

    const { data: patients, error } = await query;
    if (error) throw error;

    if (!patients || patients.length === 0) return 0;

    // Add each patient to the BullMQ sms queue
    const jobs = patients
      .filter((p) => p.phone)
      .map((p) => ({
        name: 'marketing-sms',
        data: {
          clinicId,
          patientId: p.id,
          phone: p.phone,
          message,
        },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 }
        }
      }));

    await smsQueue.addBulk(jobs);

    return jobs.length;
  }
}
