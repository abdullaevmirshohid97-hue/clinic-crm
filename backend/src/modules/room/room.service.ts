import { supabase } from '../../config/supabase';

export class RoomService {
  static async getAllRooms(clinicId: string, limit: number = 50, offset: number = 0) {
    const { data: rooms, error: roomErr, count } = await supabase
      .from('rooms')
      .select('id, name, capacity, department, is_active', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .range(offset, offset + limit - 1);

    if (roomErr) throw roomErr;

    const { data: activeAssignments, error: assignErr } = await supabase
      .from('room_patients')
      .select('id, room_id, patient_id, patients(full_name, phone)')
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    if (assignErr) throw assignErr;

    const enriched = (rooms || []).map(room => {
      const occupants = (activeAssignments || []).filter((a: any) => a.room_id === room.id);
      return {
        ...room,
        occupants,
        current_occupancy: occupants.length,
        is_full: occupants.length >= (room as any).capacity,
      };
    });

    return { data: enriched, total: count || 0 };
  }

  static async assignPatient(clinicId: string, payload: { roomId: string; patientId: string; doctorId: string }) {
    const { data, error } = await supabase.rpc('assign_room_atomic', {
      p_clinic_id: clinicId,
      p_room_id: payload.roomId,
      p_patient_id: payload.patientId,
      p_doctor_id: payload.doctorId,
    });

    if (error) throw new Error(error.message || 'Failed to assign room');
    return data;
  }

  static async dischargePatient(clinicId: string, assignmentId: string) {
    const { data, error } = await supabase
      .from('room_patients')
      .update({ status: 'discharged', end_date: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('clinic_id', clinicId)
      .select('id, room_id, patient_id, status, end_date')
      .single();

    if (error) throw error;
    return data;
  }

  static async getRoomDetails(clinicId: string, roomId: string) {
    const { data: assignments, error } = await supabase
      .from('room_patients')
      .select('id, status, start_date, patient_id, doctor_id, patients(id, full_name, phone)')
      .eq('room_id', roomId)
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    if (error) throw error;
    return assignments || [];
  }
}
