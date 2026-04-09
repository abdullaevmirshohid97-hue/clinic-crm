import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import logger from '../config/logger';

// Reusable Redis connection for BullMQ
const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const smsQueueName = 'sms-queue';
export const backupQueueName = 'backup-queue';

export const smsQueue = new Queue(smsQueueName, { connection });
export const backupQueue = new Queue(backupQueueName, { connection });

// Initialize queue events to monitor failures
const smsQueueEvents = new QueueEvents(smsQueueName, { connection });
smsQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`SMS Job ${jobId} failed: ${failedReason}`);
});

const backupQueueEvents = new QueueEvents(backupQueueName, { connection });
backupQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Backup Job ${jobId} failed: ${failedReason}`);
});

logger.info('BullMQ Initialized for SMS and Backup queues');
