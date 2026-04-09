import { supabase } from '../config/supabase';
import { smsQueue } from '../config/queue';

export class LabService {
  static async updateTestStatus(clinicId: string, testId: string, status: string, resultDetails?: any) {
    const { data: test, error } = await supabase
      .from('laboratory_tests') // Note: We need this table in our schema!
      .update({ status, result_details: resultDetails, updated_at: new Date().toISOString() })
      .eq('id', testId)
      .eq('clinic_id', clinicId)
      .select('*, patients(phone)')
      .single();

    if (error) throw error;

    // Trigger SMS when status becomes 'done'
    if (status === 'done' && test.patients?.phone) {
      await smsQueue.add(
        'lab-result-sms',
        {
          clinicId,
          patientId: test.patient_id,
          phone: test.patients.phone,
          message: 'Analizingiz tayyor, klinikaga murojaat qiling.'
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 } // 2s, 4s, 8s retries
        }
      );
    }

    return test;
  }
}
