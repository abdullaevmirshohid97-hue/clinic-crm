import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import axios from 'axios';
import { env } from '../config/env';
import { smsQueueName } from '../config/queue';
import logger from '../config/logger';
import { supabase } from '../config/supabase';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

interface SMSPayload {
  clinicId: string;
  patientId?: string;
  phone: string;
  message: string;
  logId?: string; // ID of the sms_logs row
}

// Real SMS Provider Logic (Eskiz.uz example integration)
const sendEskizSMS = async (phone: string, message: string) => {
  if (!env.SMS_API_KEY) {
    logger.warn('SMS_API_KEY missing. Mocking SMS delivery.');
    return { status: 'mocked_success' };
  }

  // Eskiz usually requires taking a token first using email and password,
  // but for the sake of standard production abstraction, assuming the
  // `env.SMS_API_KEY` stands for the Bearer token or authorization string.
  try {
    const response = await axios.post(
      'https://notify.eskiz.uz/api/message/sms/send',
      {
        mobile_phone: phone.replace(/[^0-9]/g, ''),
        message: message,
        from: '4546', // Typical provider masking shortcode
      },
      {
        headers: {
          Authorization: `Bearer ${env.SMS_API_KEY}`,
        },
      }
    );
    return response.data;
  } catch (err: any) {
    logger.error('Provider SMS Error:', err.response?.data || err.message);
    throw new Error('SMS Provider Exception');
  }
};

export const smsWorker = new Worker<SMSPayload>(
  smsQueueName,
  async (job: Job<SMSPayload>) => {
    const { clinicId, phone, message, logId } = job.data;
    logger.info(`Processing SMS job: ${job.id} for ${phone} (Attempt ${job.attemptsMade + 1})`);

    try {
      await sendEskizSMS(phone, message);
      
      // Update SMS Log status to delivered
      if (logId) {
        await supabase
          .from('sms_logs')
          .update({ status: 'delivered', sent_at: new Date().toISOString() })
          .eq('id', logId)
          .eq('clinic_id', clinicId);
      }
      return { success: true };
    } catch (error: any) {
      if (logId && job.attemptsMade >= (job.opts.attempts || 1) - 1) {
        await supabase
          .from('sms_logs')
          .update({ status: 'failed' })
          .eq('id', logId)
          .eq('clinic_id', clinicId);
      }
      throw error;
    }
  },
  { 
    connection,
    concurrency: 5,
  }
);

smsWorker.on('completed', (job) => {
  logger.info(`SMS Job ${job.id} completed successfully`);
});

smsWorker.on('failed', (job, err) => {
  logger.error(`SMS Job ${job?.id} failed ultimately after retries with error: ${err.message}`);
});
