import { Redis } from 'ioredis';
import { env } from '../config/env';
import { supabase } from '../config/supabase';
import logger from '../config/logger';

const redis = new Redis(env.REDIS_URL);

export class QueueService {
  // Generate next queue number atomically (e.g. A → A1, A2...)
  static async addToQueue(clinicId: string, patientId: string, doctorId: string, doctorPrefix: string) {
    const key = `queue:${clinicId}:${doctorId}`;
    const count = await redis.incr(key);

    // Expire daily at midnight (86400 seconds)
    await redis.expireat(key, this._getMidnightTimestamp());

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
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get all queue entries for a doctor
  static async getQueueByDoctor(clinicId: string, doctorId: string) {
    const { data, error } = await supabase
      .from('queues')
      .select('*, patients(full_name, phone)')
      .eq('clinic_id', clinicId)
      .eq('doctor_id', doctorId)
      .neq('status', 'done')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Mark the next waiting patient as "in_progress"
  static async callNext(clinicId: string, doctorId: string) {
    const { data: next, error } = await supabase
      .from('queues')
      .select('*')
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
      .select()
      .single();

    return updated;
  }

  // Mark current patient as "done"
  static async complete(clinicId: string, queueId: string) {
    const { data, error } = await supabase
      .from('queues')
      .update({ status: 'done' })
      .eq('id', queueId)
      .eq('clinic_id', clinicId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Daily reset: delete all done queues and reset Redis counter
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
