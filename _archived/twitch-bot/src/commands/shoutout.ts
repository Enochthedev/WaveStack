/**
 * Shoutout Command
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class ShoutoutCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    if (args.length === 0) {
      return this.client.say(channel, `Usage: !so <username>`);
    }

    const targetUser = args[0].replace('@', '');

    await this.client.say(
      channel,
      `📣 Go check out @${targetUser} at https://twitch.tv/${targetUser} ! They were last seen playing... something awesome! PogChamp`
    );

    this.logger.info({ targetUser }, 'Shoutout given');
  }
}
