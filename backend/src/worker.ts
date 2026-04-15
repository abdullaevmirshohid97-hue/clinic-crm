/**
 * BullMQ Worker Entry Point
 * Runs SMS and Backup job processors
 */
import './config/env';
import logger from './config/logger';

logger.info('Starting BullMQ Worker Process...');

// Import workers to start them
import './jobs/sms.job';
import './jobs/backup.job';

logger.info('Workers initialized: SMS, Backup');

// Graceful shutdown
const shutdown = async () => {
  logger.info('Worker shutting down gracefully...');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
