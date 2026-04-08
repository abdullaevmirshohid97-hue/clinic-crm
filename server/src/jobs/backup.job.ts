import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { runBackup } from '../services/backup.service';
import { BackupJobData } from '../types';
import { logger } from '../config/logger';

export const BACKUP_QUEUE = 'backup';

export const backupQueue = new Queue<BackupJobData>(BACKUP_QUEUE, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 60000,
    },
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 20 },
  },
});

/**
 * Schedule recurring backup jobs: 06:00 and 18:00 UTC daily.
 */
export async function scheduleBackupJobs(clinicId: string): Promise<void> {
  const jobName = `daily-backup-${clinicId}`;

  await backupQueue.add(
    jobName,
    { clinic_id: clinicId },
    {
      repeat: { pattern: '0 6 * * *' },
      jobId: `backup-morning-${clinicId}`,
    },
  );

  await backupQueue.add(
    jobName,
    { clinic_id: clinicId },
    {
      repeat: { pattern: '0 18 * * *' },
      jobId: `backup-evening-${clinicId}`,
    },
  );

  logger.info({ clinicId }, 'Backup cron jobs scheduled (06:00 + 18:00 UTC)');
}

export function createBackupWorker(): Worker<BackupJobData> {
  const worker = new Worker<BackupJobData>(
    BACKUP_QUEUE,
    async (job: Job<BackupJobData>) => {
      const { clinic_id } = job.data;

      logger.info({ jobId: job.id, clinic_id }, 'Processing backup job');

      await job.updateProgress(5);
      const result = await runBackup(clinic_id);
      await job.updateProgress(100);

      logger.info(
        { jobId: job.id, clinic_id, filename: result.filename, size: result.size_bytes },
        'Backup job completed',
      );

      return result;
    },
    {
      connection: redis,
      concurrency: 1,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Backup job finished successfully');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Backup job failed');
  });

  return worker;
}

/**
 * Enqueue an immediate backup job (manual trigger).
 */
export async function enqueueBackup(data: BackupJobData): Promise<string> {
  const job = await backupQueue.add('manual-backup', data, {
    jobId: `manual-backup-${data.clinic_id}-${Date.now()}`,
    priority: 1,
  });
  return job.id ?? '';
}
