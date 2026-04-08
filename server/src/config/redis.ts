import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

function createRedisClient() {
  const client = new Redis(env.REDIS_URL, {
    password: env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.error({ err }, 'Redis error'));
  client.on('close', () => logger.warn('Redis connection closed'));

  return client;
}

export const redis = createRedisClient();

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
