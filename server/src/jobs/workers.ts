import { Worker } from 'bullmq';
import { createSmsWorker } from './sms.job';
import { createBackupWorker } from './backup.job';
import { logger } from '../config/logger';

let smsWorker: Worker | null = null;
let backupWorker: Worker | null = null;

export function startWorkers(): void {
  smsWorker = createSmsWorker();
  backupWorker = createBackupWorker();
  logger.info('BullMQ workers started: [sms, backup]');
}

export async function stopWorkers(): Promise<void> {
  const stops: Promise<void>[] = [];

  if (smsWorker) stops.push(smsWorker.close());
  if (backupWorker) stops.push(backupWorker.close());

  await Promise.all(stops);
  logger.info('BullMQ workers stopped');
}
