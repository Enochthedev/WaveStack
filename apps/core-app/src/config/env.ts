import { z } from "zod";
const Env = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  PORT: z.string().default("3000")
});
export const env = Env.parse(process.env);
