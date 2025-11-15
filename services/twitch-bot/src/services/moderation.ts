/**
 * Moderation Service with AI-powered auto-moderation
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
    // AI-powered auto-moderation (if enabled)
    if (process.env.USE_AI_MODERATION === 'true') {
      try {
        const isMod = userstate.mod || userstate['user-type'] === 'mod';
        const isVIP = userstate['badges']?.vip === '1';
        const isBroadcaster = userstate['username'] === channel.replace('#', '');

        const userRoles = [];
        if (isMod) userRoles.push('mod');
        if (isVIP) userRoles.push('vip');
        if (isBroadcaster) userRoles.push('broadcaster');

        const moderationResponse = await fetch(`${process.env.AUTO_MOD_URL || 'http://auto-mod:8700'}/api/v1/moderate/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            user_id: userstate['user-id'] || userstate.username!,
            username: userstate.username!,
            platform: 'twitch',
            channel_id: channel,
            user_roles: userRoles,
          }),
        });

        if (moderationResponse.ok) {
          const modResult = await moderationResponse.json();

          // Handle moderation actions
          if (modResult.should_delete) {
            await this.client.deletemessage(channel, userstate.id!);
            this.logger.info({
              username: userstate.username,
              violations: modResult.violations,
            }, 'Message deleted by AI moderation');
          }

          if (modResult.should_timeout) {
            await this.client.timeout(channel, userstate.username!, modResult.timeout_duration, modResult.reason || 'Auto-moderation');
            await this.client.say(channel, `⚠️ @${userstate.username} has been timed out for ${modResult.timeout_duration}s. Reason: ${modResult.reason}`);

            this.logger.info({
              username: userstate.username,
              duration: modResult.timeout_duration,
              reason: modResult.reason,
            }, 'User timed out by AI moderation');
          }

          if (modResult.should_ban) {
            await this.client.ban(channel, userstate.username!, modResult.reason || 'Auto-moderation - multiple violations');
            await this.client.say(channel, `🔨 @${userstate.username} has been banned. Reason: ${modResult.reason}`);

            this.logger.warn({
              username: userstate.username,
              reason: modResult.reason,
            }, 'User banned by AI moderation');
          }

          // Return false if any action was taken
          if (modResult.should_delete || modResult.should_timeout || modResult.should_ban) {
            return false;
          }
        }
      } catch (error) {
        this.logger.error({ err: error }, 'Error in AI moderation check');
        // Fall through to legacy moderation if AI fails
      }
    }

    // Legacy moderation (fallback)
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
