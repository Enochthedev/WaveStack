/**
 * Points Command
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class PointsCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    const targetUser = args[0]?.replace('@', '') || userstate.username;
    const pointsKey = `twitch:user:${targetUser}:points`;
    const points = await this.redis.get(pointsKey) || '0';

    const level = Math.floor(parseInt(points) / 100);

    await this.client.say(
      channel,
      `@${targetUser} has ${points} points (Level ${level}) 💰`
    );
  }
}
