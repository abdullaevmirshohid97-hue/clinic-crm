import { redisClient } from '../../config/redis';
import { supabase } from '../../config/supabase';
import logger from '../../config/logger';

export class QueueService {
  // Get queue by date with patient and doctor info
  static async getQueueByDate(clinicId: string, date: string) {
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from('queues')
      .select(`
        id,
        number,
        prefix,
        status,
        created_at,
        patient_id,
        doctor_id,
        patients (
          id,
          full_name,
          phone
        ),
        users!queues_doctor_id_fkey (
          id,
          full_name,
          prefix,
          specialty
        )
      `)
      .eq('clinic_id', clinicId)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('id', { ascending: true });

    if (error) throw error;

    // Transform data for frontend compatibility
    return (data || []).map((q: any) => ({
      id: q.id,
      number: q.number,
      prefix: q.prefix,
      status: q.status,
      createdAt: q.created_at,
      patientId: q.patient_id,
      patientName: q.patients?.full_name || null,
      patientPhone: q.patients?.phone || null,
      doctorId: q.doctor_id,
      doctorName: q.users?.full_name || null,
      doctorPrefix: q.users?.prefix || q.prefix,
    }));
  }

  // Get active doctors for queue selection
  static async getDoctors(clinicId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, prefix, specialty')
      .eq('clinic_id', clinicId)
      .eq('role', 'doctor')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;

    // Transform for frontend compatibility
    return (data || []).map((d: any) => ({
      id: d.id,
      fullName: d.full_name,
      prefix: d.prefix,
      specialty: d.specialty,
      isActive: 1
    }));
  }

  // Add new queue entry
  static async addToQueue(
    clinicId: string, 
    patientId: string | null, 
    doctorId: string, 
    patientName?: string
  ) {
    // Get doctor info for prefix
    const { data: doctor } = await supabase
      .from('users')
      .select('prefix')
      .eq('id', doctorId)
      .single();
    
    const doctorPrefix = doctor?.prefix || 'A';

    // Get next number using Redis for atomic increment
    const key = `queue:${clinicId}:${doctorId}:${new Date().toISOString().split('T')[0]}`;
    let count: number;
    
    try {
      count = await redisClient.incr(key);
      await redisClient.expireat(key, this._getMidnightTimestamp());
    } catch {
      // Fallback to DB if Redis unavailable
      const { data: maxQ } = await supabase
        .from('queues')
        .select('number')
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctorId)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .order('number', { ascending: false })
        .limit(1)
        .single();
      count = (maxQ?.number || 0) + 1;
    }

    // Create patient if name provided but no ID
    let finalPatientId = patientId;
    if (!patientId && patientName) {
      const { data: newPatient, error: patientError } = await supabase
        .from('patients')
        .insert({ clinic_id: clinicId, full_name: patientName })
        .select('id')
        .single();
      
      if (patientError) throw patientError;
      finalPatientId = newPatient.id;
    }

    // Insert queue entry
    const { data, error } = await supabase
      .from('queues')
      .insert({
        clinic_id: clinicId,
        patient_id: finalPatientId,
        doctor_id: doctorId,
        number: count,
        prefix: doctorPrefix,
        status: 'waiting',
      })
      .select('id, number, prefix, status, patient_id, doctor_id, created_at')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      number: data.number,
      prefix: data.prefix,
      status: data.status,
      patientId: data.patient_id,
      doctorId: data.doctor_id,
      createdAt: data.created_at,
    };
  }

  // Update queue status
  static async updateStatus(clinicId: string, queueId: string, status: string) {
    const updateData: any = { status };
    
    if (status === 'in_progress') {
      updateData.called_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('queues')
      .update(updateData)
      .eq('id', queueId)
      .eq('clinic_id', clinicId)
      .select('id, number, prefix, status')
      .single();

    if (error) throw error;
    return data;
  }

  // Get queue by doctor (for doctor panel)
  static async getQueueByDoctor(clinicId: string, doctorId: string, limit: number = 50, offset: number = 0) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error, count } = await supabase
      .from('queues')
      .select(`
        id, number, prefix, status, created_at,
        patients (full_name, phone)
      `, { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .neq('status', 'completed')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  // Call next patient
  static async callNext(clinicId: string, doctorId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: next, error } = await supabase
      .from('queues')
      .select('id, number, prefix, patient_id')
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId)
      .eq('status', 'waiting')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !next) return null;

    const { data: updated } = await supabase
      .from('queues')
      .update({ status: 'in_progress', called_at: new Date().toISOString() })
      .eq('id', next.id)
      .select('id, number, prefix, status, patient_id')
      .single();

    return updated;
  }

  // Complete queue entry
  static async complete(clinicId: string, queueId: string) {
    const { data, error } = await supabase
      .from('queues')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', queueId)
      .eq('clinic_id', clinicId)
      .select('id, number, prefix, status')
      .single();

    if (error) throw error;
    return data;
  }

  // Reset daily queue (cleanup)
  static async resetDailyQueue(clinicId: string) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { error } = await supabase
      .from('queues')
      .delete()
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .lt('created_at', yesterday.toISOString());

    if (error) logger.error(error, 'Queue Reset Error');
    logger.info(`Daily queue cleanup for clinic: ${clinicId}`);
  }

  private static _getMidnightTimestamp(): number {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return Math.floor(midnight.getTime() / 1000);
  }
}
