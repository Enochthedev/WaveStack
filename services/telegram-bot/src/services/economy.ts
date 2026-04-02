import type { Logger } from 'pino';
import type { RedisClientType } from 'redis';

const POINTS_PER_MESSAGE = 1;
const COOLDOWN_SECONDS = 30;

export class EconomyService {
  private redis: RedisClientType;
  private logger: Logger;

  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
  }

  async awardMessagePoints(userId: string): Promise<void> {
    const cooldownKey = `economy:cooldown:${userId}`;
    const exists = await this.redis.exists(cooldownKey);
    if (exists) return;

    await this.redis.incrBy(`points:${userId}`, POINTS_PER_MESSAGE);
    await this.redis.set(cooldownKey, '1', { EX: COOLDOWN_SECONDS });
  }
}
