import { z } from "zod";

const Env = z.object({
  PORT: z.coerce.number().default(4000),
  REDIS_URL: z.string().default("redis://redis:6379"),
  INTERNAL_SERVICE_SECRET: z.string().default("dev-internal-secret"),
  // Expo push notifications
  EXPO_ACCESS_TOKEN: z.string().default(""),
  // Resend (transactional email)
  RESEND_API_KEY: z.string().default(""),
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().default(""),
});

export const config = Env.parse(process.env);
