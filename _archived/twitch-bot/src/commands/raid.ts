/**
 * Raid Command
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class RaidCommand {
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
      return this.client.say(channel, `Usage: !raid <username>`);
    }

    const targetChannel = args[0].replace('@', '');

    await this.client.say(channel, `🎯 Preparing to raid @${targetChannel}! Get ready chat! PogChamp`);

    // Countdown
    for (let i = 3; i > 0; i--) {
      setTimeout(async () => {
        await this.client.say(channel, `${i}...`);
      }, (3 - i) * 1000);
    }

    setTimeout(async () => {
      await this.client.say(channel, `🎊 RAIDING @${targetChannel} NOW! https://twitch.tv/${targetChannel}`);
      this.logger.info({ targetChannel }, 'Raid initiated');
    }, 3000);
  }
}
