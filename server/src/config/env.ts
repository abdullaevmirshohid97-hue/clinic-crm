import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Redis
  REDIS_URL: z.string().default('redis://redis:6379'),
  REDIS_PASSWORD: z.string().optional(),

  // SMS Provider
  SMS_PROVIDER_API_KEY: z.string().optional(),
  SMS_PROVIDER_SECRET: z.string().optional(),
  SMS_PROVIDER_URL: z.string().url().optional(),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32).default('change-this-secret-in-production-minimum-32-chars'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
