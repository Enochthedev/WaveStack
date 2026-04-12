import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("3200").transform(Number),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  MCP_GATEWAY_URL: z.string().url(),
  INTERNAL_SERVICE_SECRET: z.string().default("dev-internal-secret"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
