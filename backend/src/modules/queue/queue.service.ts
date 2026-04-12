import { redisClient } from '../../config/redis';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import logger from '../../config/logger';

export class QueueService {
  static async addToQueue(clinicId: string, patientId: string, doctorId: string, doctorPrefix: string) {
    const key = `queue:${clinicId}:${doctorId}`;
    const count = await redisClient.incr(key);
    await redisClient.expireat(key, this._getMidnightTimestamp());

    const number = `${doctorPrefix}${count}`;

    const { data, error } = await supabase
      .from('queues')
      .insert({
        clinic_id: clinicId,
        patient_id: patientId,
        doctor_id: doctorId,
        number,
        status: 'waiting',
      })
      .select('id, number, status, patient_id, doctor_id, created_at')
      .single();

    if (error) throw error;
    return data;
  }

  static async getQueueByDoctor(clinicId: string, doctorId: string, limit: number = 50, offset: number = 0) {
    const { data, error, count } = await supabase
      .from('queues')
      .select('id, number, status, patient_id, doctor_id, created_at, patients(full_name, phone)', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId)
      .neq('status', 'done')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  }

  static async callNext(clinicId: string, doctorId: string) {
    const { data: next, error } = await supabase
      .from('queues')
      .select('id, number, status, patient_id')
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId)
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) return null;

    const { data: updated } = await supabase
      .from('queues')
      .update({ status: 'in_progress' })
      .eq('id', next.id)
      .select('id, number, status, patient_id')
      .single();

    return updated;
  }

  static async complete(clinicId: string, queueId: string) {
    const { data, error } = await supabase
      .from('queues')
      .update({ status: 'done' })
      .eq('id', queueId)
      .eq('clinic_id', clinicId)
      .select('id, number, status')
      .single();

    if (error) throw error;
    return data;
  }

  static async resetDailyQueue(clinicId: string) {
    const { error } = await supabase
      .from('queues')
      .delete()
      .eq('clinic_id', clinicId)
      .eq('status', 'done');

    if (error) logger.error(error, 'Queue Reset Error');
    logger.info(`Daily queue reset for clinic: ${clinicId}`);
  }

  private static _getMidnightTimestamp(): number {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return Math.floor(midnight.getTime() / 1000);
  }
}
