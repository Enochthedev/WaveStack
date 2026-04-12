import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(4100),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  INTERNAL_SERVICE_SECRET: z.string().default("dev-internal-secret"),
  CACHE_TTL_SECONDS: z.coerce.number().default(300),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OAUTH_CALLBACK_URL: z.string().optional(),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:', parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;
