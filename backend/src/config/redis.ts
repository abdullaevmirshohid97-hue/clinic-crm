import IORedis from 'ioredis';
import { env } from './env';
import logger from './logger';

class RedisManager {
  private static client: IORedis | null = null;

  static getClient(): IORedis {
    if (!this.client) {
      this.client = new IORedis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
          if (times > 5) {
            logger.error(`[Redis] Multiple connection retries failed. Exhausted.`);
            return null; // Stop retrying
          }
          return Math.min(times * 1000, 5000); // Backoff strategy
        }
      });

      this.client.on('error', (err) => {
        // Prevent console spam from 'already connecting' driver internals
        if (err.message.includes('already connecting')) return; 
        logger.error(`[Redis Core] Connection error: ${err.message}`);
      });

      this.client.on('ready', () => logger.info('[Redis Core] Ready and connected'));
    }
    return this.client;
  }

  static createWorkerConnection(): IORedis {
    const conn = this.getClient().duplicate();
    conn.on('error', (err) => {
      if (!err.message.includes('already connecting')) {
        logger.error(`[Redis Worker] Connection error: ${err.message}`);
      }
    });
    return conn;
  }
}

export const redisClient = RedisManager.getClient();
export const createWorkerConnection = () => RedisManager.createWorkerConnection();
