import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { env } from '../config/env';
import { supabase } from '../config/database';
import { logger } from '../config/logger';

export interface BackupResult {
  clinic_id: string;
  filename: string;
  size_bytes: number;
  telegram_message_id?: number;
  created_at: string;
}

/**
 * Export clinic data from Supabase, gzip it, and upload to Telegram.
 */
export async function runBackup(clinicId: string): Promise<BackupResult> {
  logger.info({ clinicId }, 'Starting backup');

  // 1. Fetch clinic data
  const [patients, appointments] = await Promise.all([
    supabase.from('patients').select('*').eq('clinic_id', clinicId),
    supabase.from('appointments').select('*').eq('clinic_id', clinicId),
  ]);

  const backupPayload = JSON.stringify({
    exported_at: new Date().toISOString(),
    clinic_id: clinicId,
    patients: patients.data ?? [],
    appointments: appointments.data ?? [],
  });

  // 2. Gzip compress
  const compressed = await compressData(backupPayload);
  const filename = `backup_${clinicId}_${Date.now()}.json.gz`;

  logger.info({ clinicId, filename, size: compressed.length }, 'Backup compressed');

  // 3. Upload to Telegram
  let telegramMessageId: number | undefined;
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    telegramMessageId = await uploadToTelegram(filename, compressed);
  } else {
    logger.warn('Telegram not configured — skipping upload');
  }

  // 4. Store metadata in DB
  const result: BackupResult = {
    clinic_id: clinicId,
    filename,
    size_bytes: compressed.length,
    telegram_message_id: telegramMessageId,
    created_at: new Date().toISOString(),
  };

  await supabase.from('backups').insert(result);

  logger.info({ clinicId, filename }, 'Backup completed');
  return result;
}

async function compressData(data: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const source = Readable.from([Buffer.from(data)]);
  const gzip = createGzip();

  await pipeline(source, gzip, async function* (compressed) {
    for await (const chunk of compressed) {
      chunks.push(chunk as Buffer);
    }
  });

  return Buffer.concat(chunks);
}

async function uploadToTelegram(filename: string, data: Buffer): Promise<number> {
  const formData = new FormData();
  formData.append('chat_id', env.TELEGRAM_CHAT_ID!);
  formData.append('document', new Blob([data]), filename);
  formData.append('caption', `📦 Clinic backup: ${filename}`);

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`,
    { method: 'POST', body: formData },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram upload failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as { ok: boolean; result: { message_id: number } };
  return json.result.message_id;
}
