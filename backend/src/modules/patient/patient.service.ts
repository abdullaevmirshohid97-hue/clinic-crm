import { supabase } from '../../config/supabase';
import { UserPayload } from '../../types/express';
import { logAudit } from '../../middleware/audit.middleware';

export class PatientService {
  /**
   * Get patients with ownership filtering:
   * - doctor → only own patients (doctor_id)
   * - admin/super_admin → all clinic patients
   * - nurse → all clinic patients (view only)
   */
  static async getPatients(user: UserPayload, limit: number, offset: number) {
    let query = supabase
      .from('patients')
      .select('id, full_name, phone, birth_date, gender, created_at', { count: 'exact' })
      .eq('clinic_id', user.clinic_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Ownership: doctors see only their own patients
    if (user.role === 'doctor') {
      query = query.eq('doctor_id', user.id);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return { data: data || [], total: count || 0 };
  }

  static async getPatientById(user: UserPayload, patientId: string) {
    let query = supabase
      .from('patients')
      .select('id, full_name, phone, birth_date, gender, address, notes, created_at')
      .eq('id', patientId)
      .eq('clinic_id', user.clinic_id);

    // Ownership
    if (user.role === 'doctor') {
      query = query.eq('doctor_id', user.id);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data;
  }

  static async createPatient(user: UserPayload, patientData: any) {
    // Step 1: Atomic limit check via PostgreSQL RPC (race-condition safe)
    const { error: rpcError } = await supabase.rpc('create_patient_safe', {
      p_clinic_id: user.clinic_id,
      p_name: patientData.full_name || patientData.name || 'Unknown',
      p_phone: patientData.phone || null,
      p_created_by: user.id,
    });

    if (rpcError) {
      if (rpcError.message.includes('limit reached')) throw new Error('Patient limit reached for your plan');
      if (rpcError.message.includes('Invalid plan')) throw new Error('Plan configuration error');
      throw rpcError;
    }

    // Step 2: Fetch the just-created patient (RPC already inserted it)
    const { data, error } = await supabase
      .from('patients')
      .select()
      .eq('clinic_id', user.clinic_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    // Step 3: Update with full patient data if needed (doctor_id, extra fields)
    const extraFields: any = {};
    if (user.role === 'doctor') extraFields.doctor_id = user.id;
    else if (patientData.doctor_id) extraFields.doctor_id = patientData.doctor_id;
    if (patientData.birth_date) extraFields.birth_date = patientData.birth_date;
    if (patientData.gender) extraFields.gender = patientData.gender;
    if (patientData.address) extraFields.address = patientData.address;
    if (patientData.notes) extraFields.notes = patientData.notes;

    if (Object.keys(extraFields).length > 0) {
      await supabase.from('patients').update(extraFields).eq('id', data.id);
    }

    await logAudit({
      clinic_id: user.clinic_id,
      user_id: user.id,
      action: 'patient.create',
      entity_type: 'patient',
      entity_id: data.id,
    });

    return data;
  }

  static async updatePatient(user: UserPayload, patientId: string, updateData: any) {
    // Remove sensitive fields
    const { clinic_id, id, ...safeData } = updateData;

    let query = supabase
      .from('patients')
      .update(safeData)
      .eq('id', patientId)
      .eq('clinic_id', user.clinic_id);

    // Ownership
    if (user.role === 'doctor') {
      query = query.eq('doctor_id', user.id);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;

    await logAudit({
      clinic_id: user.clinic_id,
      user_id: user.id,
      action: 'patient.update',
      entity_type: 'patient',
      entity_id: patientId,
    });

    return data;
  }
}
