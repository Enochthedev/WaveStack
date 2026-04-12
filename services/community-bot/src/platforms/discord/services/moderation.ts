/**
 * Moderation Service
 * Auto-moderation for spam, links, and inappropriate content
 */
import { Client, Message, GuildMember } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class ModerationService {
  private client: Client;
  private redis: RedisClientType;
  private logger: Logger;
  private messageHistory: Map<string, number[]> = new Map();

  constructor(client: Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async checkMessage(message: Message): Promise<boolean> {
    if (!process.env.AUTO_MOD_ENABLED || process.env.AUTO_MOD_ENABLED !== 'true') {
      return true;
    }

    // Check spam
    if (await this.isSpam(message)) {
      await this.handleSpam(message);
      return false;
    }

    // Check links
    if (await this.hasUnauthorizedLinks(message)) {
      await this.handleUnauthorizedLink(message);
      return false;
    }

    return true;
  }

  private async isSpam(message: Message): Promise<boolean> {
    const userId = message.author.id;
    const now = Date.now();
    const threshold = parseInt(process.env.SPAM_THRESHOLD || '5');
    const windowMs = 10000; // 10 seconds

    // Get or initialize message history
    let timestamps = this.messageHistory.get(userId) || [];

    // Remove old timestamps
    timestamps = timestamps.filter(ts => now - ts < windowMs);

    // Add current timestamp
    timestamps.push(now);
    this.messageHistory.set(userId, timestamps);

    // Clean up old entries periodically
    if (timestamps.length > threshold) {
      this.messageHistory.set(userId, timestamps.slice(-threshold));
    }

    return timestamps.length > threshold;
  }

  private async hasUnauthorizedLinks(message: Message): Promise<boolean> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.content.match(urlRegex);

    if (!urls) return false;

    const whitelist = (process.env.LINK_WHITELIST || '').split(',');

    for (const url of urls) {
      const isWhitelisted = whitelist.some(domain => url.includes(domain));
      if (!isWhitelisted) {
        return true;
      }
    }

    return false;
  }

  private async handleSpam(message: Message) {
    try {
      await message.delete();

      const warningKey = `user:${message.author.id}:warnings:spam`;
      const warnings = await this.redis.incr(warningKey);
      await this.redis.expire(warningKey, 3600); // Expire in 1 hour

      await message.channel.send(
        `⚠️ ${message.author}, please slow down! You're sending messages too quickly. (Warning ${warnings}/3)`
      );

      if (warnings >= 3) {
        const member = message.member as GuildMember;
        await member.timeout(5 * 60 * 1000, 'Spam'); // 5 minute timeout
        await message.channel.send(`🔇 ${message.author} has been timed out for spam.`);
      }

      this.logger.info({
        userId: message.author.id,
        warnings,
      }, 'Spam detected');

    } catch (error) {
      this.logger.error({ err: error }, 'Error handling spam');
    }
  }

  private async handleUnauthorizedLink(message: Message) {
    try {
      await message.delete();

      await message.channel.send(
        `🔗 ${message.author}, please don't post unauthorized links. Contact a moderator if you need to share a link.`
      );

      this.logger.info({
        userId: message.author.id,
        content: message.content,
      }, 'Unauthorized link detected');

    } catch (error) {
      this.logger.error({ err: error }, 'Error handling unauthorized link');
    }
  }
}
