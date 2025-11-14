/**
 * Moderation Service
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class ModerationService {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async checkMessage(channel: string, userstate: tmi.ChatUserstate, message: string): Promise<boolean> {
    // Check banned words
    if (process.env.SPAM_PROTECTION === 'true') {
      const bannedWords = (process.env.BANNED_WORDS || '').toLowerCase().split(',');
      const messageLower = message.toLowerCase();

      for (const word of bannedWords) {
        if (word && messageLower.includes(word.trim())) {
          await this.client.deletemessage(channel, userstate.id!);
          await this.client.say(channel, `@${userstate.username}, that word is not allowed here.`);
          this.logger.warn({ username: userstate.username }, 'Banned word detected');
          return false;
        }
      }
    }

    // Check caps
    if (process.env.CAPS_PROTECTION === 'true') {
      const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
      if (message.length > 10 && capsRatio > 0.7) {
        await this.client.deletemessage(channel, userstate.id!);
        await this.client.say(channel, `@${userstate.username}, please don't use excessive caps.`);
        return false;
      }
    }

    // Check links
    if (process.env.LINK_PROTECTION === 'true') {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (urlRegex.test(message)) {
        const isMod = userstate.mod || userstate['user-type'] === 'mod';
        const isVIP = userstate['badges']?.vip === '1';

        if (!isMod && !isVIP) {
          await this.client.deletemessage(channel, userstate.id!);
          await this.client.say(channel, `@${userstate.username}, links are not allowed.`);
          return false;
        }
      }
    }

    return true;
  }
}
