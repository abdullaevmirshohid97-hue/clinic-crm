import { backupQueueName, backupQueue } from './queue';
import logger from './logger';
import { env } from './env';

export const initScheduler = async () => {
  // Clear any existing repeatable jobs to avoid duplicates
  const repeatableJobs = await backupQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await backupQueue.removeRepeatableByKey(job.key);
  }

  // Schedule Backup for 08:00 and 20:00 every day
  // Assuming clinicId is passed statically for single-tenant or needs looping for multi-tenant.
  // For multi-tenant SaaS, you'd typically have a separate chron that queries all active clinics and adds a job for each.
  // We'll simulate a generic trigger here.
  
  await backupQueue.add(
    'daily-backup-morning',
    { clinicId: 'global' }, // In real app, loop all clinics
    { repeat: { pattern: '0 8 * * *' } }
  );

  await backupQueue.add(
    'daily-backup-evening',
    { clinicId: 'global' },
    { repeat: { pattern: '0 20 * * *' } }
  );

  logger.info('Scheduler initialized: Telegram Backups set for 08:00 and 20:00');
};
