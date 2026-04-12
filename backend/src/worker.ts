import { smsWorker } from './jobs/sms.job';
import { backupWorker } from './jobs/backup.job';
import { subscriptionWorker } from './jobs/subscription.job';
import logger from './config/logger';

logger.info('🚀 BullMQ Workers starting...');

// The workers are initialized by importing them. 
// They start automatically upon instantiation in their respective files.

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing workers...');
  await Promise.all([
    smsWorker.close(),
    backupWorker.close(),
    subscriptionWorker.close()
  ]);
  process.exit(0);
});
