import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { sendSms } from '../services/sms.service';
import { SmsJobData } from '../types';
import { logger } from '../config/logger';

export const SMS_QUEUE = 'sms';

export const smsQueue = new Queue<SmsJobData>(SMS_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

export function createSmsWorker(): Worker<SmsJobData> {
  const worker = new Worker<SmsJobData>(
    SMS_QUEUE,
    async (job: Job<SmsJobData>) => {
      const { phone, message, patient_id, clinic_id } = job.data;

      logger.info(
        { jobId: job.id, patient_id, clinic_id, phone },
        'Processing SMS job',
      );

      await job.updateProgress(10);
      await sendSms({ phone, message });
      await job.updateProgress(100);

      logger.info({ jobId: job.id, patient_id }, 'SMS job completed');
    },
    {
      connection: redis,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'SMS job finished successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'SMS job failed');
  });

  return worker;
}

/**
 * Enqueue an SMS job.
 */
export async function enqueueSms(data: SmsJobData): Promise<string> {
  const job = await smsQueue.add('send-sms', data, {
    jobId: `sms-${data.patient_id}-${Date.now()}`,
  });
  return job.id ?? '';
}
