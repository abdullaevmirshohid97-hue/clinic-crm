import { supabase } from '../../config/supabase';

export class NurseService {
  static async getDashboardData(clinicId: string, filters?: { roomId?: string; doctorId?: string }) {
    let query = supabase
      .from('room_patients')
      .select('id, status, start_date, patient_id, room_id, doctor_id, patients(id, full_name, phone)')
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    if (filters?.roomId) {
      query = query.eq('room_id', filters.roomId);
    }

    if (filters?.doctorId) {
      query = query.eq('doctor_id', filters.doctorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}
