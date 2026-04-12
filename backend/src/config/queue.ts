import { Queue, QueueEvents } from 'bullmq';
import { redisClient, createWorkerConnection } from './redis';
import logger from './logger';

export const smsQueueName = 'sms-queue';
export const backupQueueName = 'backup-queue';

export const smsQueue = new Queue(smsQueueName, { connection: redisClient });
export const backupQueue = new Queue(backupQueueName, { connection: redisClient });

// Initialize queue events using duplicated worker connections
const smsQueueEvents = new QueueEvents(smsQueueName, { connection: createWorkerConnection() });
smsQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`SMS Job ${jobId} failed: ${failedReason}`);
});

const backupQueueEvents = new QueueEvents(backupQueueName, { connection: createWorkerConnection() });
backupQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Backup Job ${jobId} failed: ${failedReason}`);
});

logger.info('BullMQ Initialized for SMS and Backup queues using Redis Singleton');
