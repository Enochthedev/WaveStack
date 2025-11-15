/**
 * Economy Service
 * Handles point rewards for messages and voice activity
 */
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class EconomyService {
  private redis: RedisClientType;
  private logger: Logger;
  private messageTimestamps: Map<string, number> = new Map();

  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
  }

  async awardMessagePoints(userId: string): Promise<void> {
    // Cooldown check (prevent spam)
    const lastMessage = this.messageTimestamps.get(userId);
    const now = Date.now();

    if (lastMessage && now - lastMessage < 60000) {
      return; // Less than 1 minute since last reward
    }

    this.messageTimestamps.set(userId, now);

    // Award points
    const points = parseInt(process.env.POINTS_PER_MESSAGE || '1');
    const pointsKey = `user:${userId}:points`;
    await this.redis.incrBy(pointsKey, points);

    this.logger.debug({ userId, points }, 'Awarded message points');
  }

  async awardVoicePoints(userId: string, minutes: number): Promise<void> {
    const pointsPerMinute = parseInt(process.env.POINTS_PER_MINUTE_VOICE || '2');
    const points = minutes * pointsPerMinute;

    const pointsKey = `user:${userId}:points`;
    await this.redis.incrBy(pointsKey, points);

    this.logger.debug({ userId, minutes, points }, 'Awarded voice points');
  }

  async getPoints(userId: string): Promise<number> {
    const pointsKey = `user:${userId}:points`;
    const points = await this.redis.get(pointsKey);
    return parseInt(points || '0');
  }

  async getLevel(userId: string): Promise<number> {
    const points = await this.getPoints(userId);
    return Math.floor(points / 100);
  }

  async transferPoints(fromUserId: string, toUserId: string, amount: number): Promise<boolean> {
    const fromPoints = await this.getPoints(fromUserId);

    if (fromPoints < amount) {
      return false;
    }

    const fromKey = `user:${fromUserId}:points`;
    const toKey = `user:${toUserId}:points`;

    await this.redis.decrBy(fromKey, amount);
    await this.redis.incrBy(toKey, amount);

    this.logger.info({ fromUserId, toUserId, amount }, 'Points transferred');
    return true;
  }
}
