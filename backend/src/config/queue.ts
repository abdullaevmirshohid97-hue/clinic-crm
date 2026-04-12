import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import logger from '../config/logger';

// Reusable Redis connection for BullMQ
export const redisConnection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    logger.warn(`Redis connection failed (attempt ${times}). Retrying cautiously...`);
    return Math.min(times * 1000, 10000); // Wait up to 10s between retries
  }
});

redisConnection.on('error', (err) => {
  logger.error('Redis connection error - running in degraded mode');
});

export const smsQueueName = 'sms-queue';
export const backupQueueName = 'backup-queue';

export const smsQueue = new Queue(smsQueueName, { connection: redisConnection });
export const backupQueue = new Queue(backupQueueName, { connection: redisConnection });

// Initialize queue events to monitor failures
const smsQueueEvents = new QueueEvents(smsQueueName, { connection: redisConnection });
smsQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`SMS Job ${jobId} failed: ${failedReason}`);
});

const backupQueueEvents = new QueueEvents(backupQueueName, { connection: redisConnection });
backupQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Backup Job ${jobId} failed: ${failedReason}`);
});

logger.info('BullMQ Initialized for SMS and Backup queues');
