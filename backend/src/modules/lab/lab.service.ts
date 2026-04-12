import { supabase } from '../../config/supabase';
import { smsQueue } from '../../config/queue';

export class LabService {
  static async updateTestStatus(clinicId: string, testId: string, status: string, resultDetails?: any) {
    const { data: test, error } = await supabase
      .from('laboratory_tests')
      .update({ status, result_details: resultDetails, updated_at: new Date().toISOString() })
      .eq('id', testId)
      .eq('clinic_id', clinicId)
      .select('id, status, result_details, patient_id, patients(phone)')
      .single();

    if (error) throw error;

    const patientPhone = (test as any).patients?.phone;
    if (status === 'done' && patientPhone) {
      await smsQueue.add(
        'lab-result-sms',
        {
          clinicId,
          patientId: (test as any).patient_id,
          phone: patientPhone,
          message: 'Analizingiz tayyor, klinikaga murojaat qiling.',
        },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );
    }

    return test;
  }
}
