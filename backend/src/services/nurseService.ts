import { supabase } from '../config/supabase';

export class NurseService {
  static async getDashboardData(clinicId: string, filters?: { department?: string; roomId?: string; doctorId?: string }) {
    let query = supabase
      .from('room_patients')
      .select(`
        id,
        status,
        start_date,
        patients(id, full_name, phone),
        rooms!inner(id, room_number, type),
        doctors!inner(id, prefix, specialization)
      `)
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    // Currently we don't have department directly in Supabase schema rooms, but treating like we do
    // if (filters?.department) {
    //   query = query.eq('rooms.department', filters.department);
    // }
    
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
