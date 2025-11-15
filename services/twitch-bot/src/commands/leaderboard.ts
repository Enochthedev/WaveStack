/**
 * Leaderboard Command
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class LeaderboardCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    const allKeys = await this.redis.keys('twitch:user:*:points');

    const leaderboard = await Promise.all(
      allKeys.map(async key => {
        const username = key.split(':')[2];
        const points = parseInt(await this.redis.get(key) || '0');
        return { username, points };
      })
    );

    leaderboard.sort((a, b) => b.points - a.points);
    const top3 = leaderboard.slice(0, 3);

    const message = top3.map((entry, index) => {
      const medal = ['🥇', '🥈', '🥉'][index];
      return `${medal} ${entry.username}: ${entry.points}`;
    }).join(' | ');

    await this.client.say(channel, `🏆 Leaderboard: ${message}`);
  }
}
