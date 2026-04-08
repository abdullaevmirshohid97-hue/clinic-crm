/**
 * Worker Process Entry Point
 *
 * This runs as a separate process alongside the API server.
 * Start with: node dist/worker/index.js
 */
import { logger } from '../src/config/logger';
import { connectRedis, disconnectRedis } from '../src/config/redis';
import { startWorkers, stopWorkers } from '../src/jobs/workers';

async function start(): Promise<void> {
  logger.info('Starting BullMQ worker process...');

  await connectRedis();
  startWorkers();

  logger.info('Workers running. Waiting for jobs...');
}

// ─── Graceful Shutdown ─────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Worker shutdown signal received');
  await stopWorkers();
  await disconnectRedis();
  logger.info('Worker process stopped cleanly');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception in worker');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection in worker');
  process.exit(1);
});

start().catch((err) => {
  logger.error({ err }, 'Failed to start worker process');
  process.exit(1);
});
