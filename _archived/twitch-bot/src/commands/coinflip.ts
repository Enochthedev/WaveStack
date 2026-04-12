/**
 * Coinflip Command for Twitch
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class CoinflipCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    const call = args[0]?.toLowerCase();
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const emoji = result === 'heads' ? '🪙' : '🥇';

    if (!call || !['heads', 'tails'].includes(call)) {
      await this.client.say(
        channel,
        `${emoji} @${userstate.username} → ${result.toUpperCase()}! (Call it next time: !coinflip heads/tails)`
      );
      return;
    }

    const won = call === result;

    // Award points for win
    if (won) {
      const pointsKey = `twitch:user:${userstate.username}:points`;
      await this.redis.incrBy(pointsKey, 10);
    }

    await this.client.say(
      channel,
      `${emoji} @${userstate.username} called ${call.toUpperCase()} → ${result.toUpperCase()}! ${won ? '✅ You win! (+10 points)' : '❌ You lose!'}`
    );
  }
}
