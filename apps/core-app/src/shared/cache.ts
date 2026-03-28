/**
 * Simple Redis-backed cache utility for hot-path data (analytics, trends, etc.).
 * Falls back gracefully if Redis is unavailable — cache misses don't break anything.
 */
import Redis from "ioredis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? "redis://redis:6379", {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on("error", () => {}); // Swallow — cache is best-effort
  }
  return redis;
}

/**
 * Get a cached value. Returns null on miss or Redis failure.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedis().get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with TTL in seconds. Silently fails if Redis is down.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache is best-effort
  }
}

/**
 * Delete a cached key. Use after mutations that invalidate cached data.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch {
    // Cache is best-effort
  }
}

/**
 * Cache-aside pattern: return cached value if available, otherwise
 * run the fetcher, cache the result, and return it.
 */
export async function cacheable<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
