import { createClient } from "redis";
import { env } from "../config/env";
import { logger } from "./logger";

export const redis = createClient({
  url: env.REDIS_URL,
});

redis.on("error", (err) => logger.error({ err }, "Redis Client Error"));
redis.on("connect", () => logger.info("Redis connected"));

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function disconnectRedis() {
  if (redis.isOpen) {
    await redis.disconnect();
  }
}
