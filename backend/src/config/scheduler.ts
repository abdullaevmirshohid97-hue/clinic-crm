import { backupQueueName, backupQueue } from './queue';
import logger from './logger';
import cron from 'node-cron';
import { processExpiredSubscriptions } from '../jobs/subscription.job';

export const initScheduler = async () => {
  // 1. Subscription Expiration Check (Daily at 00:00)
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily subscription expiration check...');
    await processExpiredSubscriptions();
  });

  // 2. Clear existing repeatable backup jobs
  const repeatableJobs = await backupQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await backupQueue.removeRepeatableByKey(job.key);
  }

  // 3. Schedule Backups...
  await backupQueue.add(
    'daily-backup-morning',
    { clinicId: 'global' },
    { repeat: { pattern: '0 8 * * *' } }
  );

  await backupQueue.add(
    'daily-backup-evening',
    { clinicId: 'global' },
    { repeat: { pattern: '0 20 * * *' } }
  );

  logger.info('Scheduler initialized: Subscriptions checked daily at 00:00, Backups at 08h/20h');
};
