import { z } from "zod";
const Env = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  PORT: z.string().default("3000")
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, { message: "PORT must be a valid port number" }),
  AUTH_MODE: z.enum(['none', 'hs256', 'jwks']).default('none'),
  AUTH_JWT_SECRET: z.string().optional(),
  AUTH_JWKS_URL: z.string().url().optional(),
  AUTH_AUDIENCE: z.string().optional(),
  AUTH_ISSUER: z.string().optional(),
  CLIPPER_URL: z.string().url().default('http://clipper:8080'),
  RATE_LIMIT_POINTS: z.string().default('100').transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, { message: "RATE_LIMIT_POINTS must be a positive number" }),
  RATE_LIMIT_DURATION: z.string().default('60').transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, { message: "RATE_LIMIT_DURATION must be a positive number" }),
  CORS_ORIGINS: z.string().default('*'),
});
export const env = Env.parse(process.env);
