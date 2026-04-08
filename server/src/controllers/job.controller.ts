import { Request, Response, NextFunction } from 'express';
import { smsQueue, enqueueSms } from '../jobs/sms.job';
import { backupQueue, enqueueBackup } from '../jobs/backup.job';
import { smsJobSchema } from '../utils/validators';
import { AuthenticatedRequest, JobInfo } from '../types';

export async function enqueueSmsJob(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    const input = smsJobSchema.parse(req.body);
    const jobId = await enqueueSms({ ...input, clinic_id });
    res.status(202).json({ success: true, data: { job_id: jobId } });
  } catch (err) {
    next(err);
  }
}

export async function enqueueBackupJob(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { clinic_id } = (req as AuthenticatedRequest).user;
    const jobId = await enqueueBackup({ clinic_id });
    res.status(202).json({ success: true, data: { job_id: jobId } });
  } catch (err) {
    next(err);
  }
}

export async function getSmsJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const job = await smsQueue.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    const state = await job.getState();
    const info: JobInfo = {
      id: job.id ?? '',
      name: job.name,
      status: state as JobInfo['status'],
      data: job.data as unknown as Record<string, unknown>,
      progress: (job.progress as number) ?? 0,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      createdAt: job.timestamp,
      processedAt: job.processedOn ?? undefined,
      finishedAt: job.finishedOn ?? undefined,
    };
    res.status(200).json({ success: true, data: info });
  } catch (err) {
    next(err);
  }
}

export async function getBackupJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const job = await backupQueue.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    const state = await job.getState();
    const info: JobInfo = {
      id: job.id ?? '',
      name: job.name,
      status: state as JobInfo['status'],
      data: job.data as unknown as Record<string, unknown>,
      progress: (job.progress as number) ?? 0,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      createdAt: job.timestamp,
      processedAt: job.processedOn ?? undefined,
      finishedAt: job.finishedOn ?? undefined,
    };
    res.status(200).json({ success: true, data: info });
  } catch (err) {
    next(err);
  }
}
