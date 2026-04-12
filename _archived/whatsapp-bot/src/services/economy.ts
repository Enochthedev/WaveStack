/**
 * Economy Service for WhatsApp Bot
 */
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class EconomyService {
  private redis: RedisClientType;
  private logger: Logger;

  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
  }

  async awardMessagePoints(userId: string): Promise<void> {
    const key = `points:cooldown:${userId}`;
    const exists = await this.redis.exists(key);

    if (!exists) {
      // Award 1 point per message (with cooldown)
      await this.redis.incrBy(`points:${userId}`, 1);
      await this.redis.setEx(key, 60, '1'); // 1 minute cooldown
    }
  }

  async getPoints(userId: string): Promise<number> {
    const points = await this.redis.get(`points:${userId}`);
    return points ? parseInt(points) : 0;
  }

  async addPoints(userId: string, amount: number): Promise<number> {
    await this.redis.incrBy(`points:${userId}`, amount);
    return this.getPoints(userId);
  }

  async removePoints(userId: string, amount: number): Promise<number> {
    await this.redis.incrBy(`points:${userId}`, -amount);
    return this.getPoints(userId);
  }
}
