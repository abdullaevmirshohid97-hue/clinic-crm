import { supabase } from '../config/supabase';

export class RoomService {
  // Get all rooms and their current occupancy status
  static async getAllRooms(clinicId: string) {
    // 1. Fetch all rooms
    const { data: rooms, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('clinic_id', clinicId);

    if (roomErr) throw roomErr;

    // 2. Fetch active room assignments
    const { data: activeAssignments, error: assignErr } = await supabase
      .from('room_patients')
      .select('*, patients(full_name, phone)')
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    if (assignErr) throw assignErr;

    // 3. Map assignments to rooms
    const enrichedRooms = rooms.map(room => {
      const occupants = activeAssignments.filter(a => a.room_id === room.id);
      return {
        ...room,
        occupants,
        current_occupancy: occupants.length,
        is_full: occupants.length >= room.capacity
      };
    });

    return enrichedRooms;
  }

  // Assign a patient to a room
  static async assignPatient(clinicId: string, payload: { roomId: string; patientId: string; doctorId: string }) {
    // 1. Check room capacity & Assign atomically via PostgreSQL Stored Procedure
    const { data, error } = await supabase.rpc('assign_room_atomic', {
      p_clinic_id: clinicId,
      p_room_id: payload.roomId,
      p_patient_id: payload.patientId,
      p_doctor_id: payload.doctorId
    });

    if (error) {
      // Supabase returns Postgres EXCEPTION messages in error.message
      throw new Error(error.message || 'Failed to assign room');
    }

    return data;
  }

  // Discharge a patient from a room
  static async dischargePatient(clinicId: string, assignmentId: string) {
    const { data, error } = await supabase
      .from('room_patients')
      .update({ 
        status: 'discharged',
        end_date: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get detailed information for a specific room (occupants, remaining debts, active treatments)
  static async getRoomDetails(clinicId: string, roomId: string) {
    // Minimal mock for demonstration. In full CRM: join payments/debts/treatments
    const { data: assignments, error } = await supabase
      .from('room_patients')
      .select(`
        *,
        patients(id, full_name, phone),
        doctors(id, prefix, specialization)
      `)
      .eq('room_id', roomId)
      .eq('clinic_id', clinicId)
      .eq('status', 'active');

    if (error) throw error;

    // In a production scenario, you would fetch real debt and treatment logs per patient here
    return {
      success: true,
      data: assignments.map(a => ({
        ...a,
        // Mocking structure for debt & treatments based on Master Plan
        debt: {
          total: 0,
          paid: 0,
          remaining: 0
        },
        treatments: []
      }))
    };
  }
}
