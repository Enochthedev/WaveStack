/**
 * Auto Clip Detector
 * Detects when to automatically create clips based on chat activity
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import { ClipService } from './clip-service';

export class AutoClipDetector {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;
  private clipService: ClipService;

  private messageBuffer: Array<{ timestamp: number; message: string; username: string }> = [];
  private lastClipTime: number = 0;
  private clipCooldown: number = 60000; // 1 minute between auto-clips

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger, clipService: ClipService) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
    this.clipService = clipService;
  }

  async checkMessage(channel: string, userstate: tmi.ChatUserstate, message: string) {
    const keywords = (process.env.AUTO_CLIP_KEYWORDS || '').toLowerCase().split(',');
    const minViewers = parseInt(process.env.AUTO_CLIP_MIN_VIEWERS || '10');

    // Add message to buffer
    this.messageBuffer.push({
      timestamp: Date.now(),
      message: message.toLowerCase(),
      username: userstate.username || '',
    });

    // Keep only last 30 seconds of messages
    const thirtySecondsAgo = Date.now() - 30000;
    this.messageBuffer = this.messageBuffer.filter(m => m.timestamp > thirtySecondsAgo);

    // Check if enough people are saying clip-worthy keywords
    const keywordMentions = this.messageBuffer.filter(m =>
      keywords.some(keyword => m.message.includes(keyword))
    );

    // Need at least 3 different people mentioning keywords
    const uniqueUsers = new Set(keywordMentions.map(m => m.username));

    if (uniqueUsers.size >= 3) {
      const now = Date.now();

      // Check cooldown
      if (now - this.lastClipTime < this.clipCooldown) {
        return; // Still on cooldown
      }

      // Check viewer count
      const viewerCount = parseInt(await this.redis.get('twitch:viewer_count') || '0');
      if (viewerCount < minViewers) {
        return;
      }

      // Create auto-clip!
      this.lastClipTime = now;
      await this.client.say(channel, '🎬 Chat went crazy! Creating auto-clip... PogChamp');

      try {
        await this.clipService.createAutoClip(channel);
        this.logger.info({ uniqueUsers: uniqueUsers.size }, 'Created auto-clip');

        // Clear buffer after creating clip
        this.messageBuffer = [];

      } catch (error) {
        this.logger.error({ err: error }, 'Failed to create auto-clip');
      }
    }
  }
}
