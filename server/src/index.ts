import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';

import { env } from './config/env';
import { logger } from './config/logger';
import { connectRedis, disconnectRedis } from './config/redis';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/error';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import clinicsRouter from './routes/clinics';
import patientsRouter from './routes/patients';
import jobsRouter from './routes/jobs';

const app = express();

// ─── Security & Parsing ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logging ───────────────────────────────────────────────────────
app.use(requestLogger);

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/clinics', clinicsRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/jobs', jobsRouter);

// ─── 404 & Error Handlers ──────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Startup ───────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await connectRedis();

  const server = app.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT, env: env.NODE_ENV }, '🚀 API server started');
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectRedis();
      logger.info('Redis disconnected');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start API server');
  process.exit(1);
});

export default app;
