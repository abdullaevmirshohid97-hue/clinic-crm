import { Worker, Job } from 'bullmq';
import { createWorkerConnection } from '../config/redis';
import { env } from '../config/env';
import { backupQueueName } from '../config/queue';
import logger from '../config/logger';
import { supabase } from '../config/supabase';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { pipeline } from 'stream';
import axios from 'axios';
import FormData from 'form-data';

const connection = createWorkerConnection();
const pipe = promisify(pipeline);

interface BackupPayload {
  clinicId: string;
}

const createDbDump = async (clinicId: string, filePath: string) => {
  // In a real PostgreSQL SaaS, you would use pg_dump or specific query exports
  // Here we simulate generating a JSON dump
  const { data, error } = await supabase.from('patients').select('*').eq('clinic_id', clinicId);
  if (error) throw error;

  const mockDump = {
    clinic_id: clinicId,
    timestamp: new Date().toISOString(),
    patients: data,
    // Add other tables here...
  };

  fs.writeFileSync(filePath, JSON.stringify(mockDump, null, 2));
};

const compressFile = async (inputPath: string, outputPath: string) => {
  const gzip = zlib.createGzip();
  const source = fs.createReadStream(inputPath);
  const destination = fs.createWriteStream(outputPath);
  await pipe(source, gzip, destination);
};

const sendToTelegramOrStorage = async (clinicId: string, filePath: string) => {
  const stats = fs.statSync(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);

  let fileUrl = 'telegram_bot_cloud';

  if (fileSizeMB > 45) {
    // 1. Scalable approach: Upload to Supabase Storage
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    logger.info(`Backup > 45MB (${fileSizeMB.toFixed(2)}MB), uploading to Supabase Storage...`);

    const { data: storageData, error } = await supabase.storage
      .from('backups')
      .upload(`${clinicId}/${fileName}`, fileBuffer, { contentType: 'application/gzip', upsert: true });

    if (error) throw new Error(`Supabase Storage Upload failed: ${error.message}`);
    
    const { data: publicUrlData } = supabase.storage.from('backups').getPublicUrl(`${clinicId}/${fileName}`);
    fileUrl = publicUrlData.publicUrl;

    // Send a message with the URL instead of the document
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: env.TELEGRAM_CHAT_ID,
        text: `📦 Scaled System Backup | Clinic: ${clinicId}\nSize: ${fileSizeMB.toFixed(2)} MB\nLink: ${fileUrl}`
      });
    }

  } else {
    // 2. Standard approach: Send file directly via Telegram
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      const formData = new FormData();
      formData.append('chat_id', env.TELEGRAM_CHAT_ID);
      formData.append('document', fs.createReadStream(filePath));
      formData.append('caption', `📦 System Backup | Clinic: ${clinicId}\nSize: ${fileSizeMB.toFixed(2)} MB`);

      await axios.post(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    }
  }

  // 3. Log in Supabase DB Records
  await supabase.from('backups').insert({
    clinic_id: clinicId,
    file_url: fileUrl,
  });
};

export const backupWorker = new Worker<BackupPayload>(
  backupQueueName,
  async (job: Job<BackupPayload>) => {
    const { clinicId } = job.data;
    logger.info(`Processing Backup job: ${job.id} for clinic ${clinicId}`);

    const tmpDir = path.resolve(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonPath = path.join(tmpDir, `backup_${clinicId}_${dateStr}.json`);
    const gzPath = `${jsonPath}.gz`;

    try {
      logger.debug('Creating JSON dump...');
      await createDbDump(clinicId, jsonPath);

      logger.debug('Compressing to GZIP...');
      await compressFile(jsonPath, gzPath);

      logger.debug('Broadcasting Backup (Telegram/Storage)...');
      await sendToTelegramOrStorage(clinicId, gzPath);

      return { success: true, file: gzPath };
    } catch (error: any) {
      logger.error('Backup Process Failed:', error);
      throw error;
    } finally {
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      if (fs.existsSync(gzPath)) fs.unlinkSync(gzPath);
    }
  },
  { 
    connection,
    concurrency: 1 
  }
);
