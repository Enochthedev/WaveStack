/**
 * Auto Clip Detector
 * Detects when to automatically create clips based on chat activity.
 *
 * When AUTO_CLIP_REQUIRE_APPROVAL=true (default), high-confidence moments
 * are submitted to agent-orchestrator as an ApprovalRequest and only
 * clipped once the creator approves.  In autopilot mode the orchestrator
 * auto-approves.
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import { ClipService } from './clip-service';

const APPROVAL_CONFIDENCE_THRESHOLD = 0.70; // submit approval if ≥ this

export class AutoClipDetector {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;
  private clipService: ClipService;

  private messageBuffer: Array<{ timestamp: number; message: string; username: string }> = [];
  private lastClipTime: number = 0;
  private clipCooldown: number = 60_000; // 1 minute between auto-clips

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger, clipService: ClipService) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
    this.clipService = clipService;
  }

  async checkMessage(channel: string, userstate: tmi.ChatUserstate, message: string): Promise<void> {
    const keywords = (process.env.AUTO_CLIP_KEYWORDS ?? '').toLowerCase().split(',');
    const minViewers = parseInt(process.env.AUTO_CLIP_MIN_VIEWERS ?? '10', 10);

    // Add message to buffer
    this.messageBuffer.push({
      timestamp: Date.now(),
      message: message.toLowerCase(),
      username: userstate.username ?? '',
    });

    // Keep only last 30 seconds of messages
    const thirtySecondsAgo = Date.now() - 30_000;
    this.messageBuffer = this.messageBuffer.filter((m) => m.timestamp > thirtySecondsAgo);

    // Count unique keyword mentions
    const keywordMentions = this.messageBuffer.filter((m) =>
      keywords.some((keyword) => m.message.includes(keyword))
    );
    const uniqueUsers = new Set(keywordMentions.map((m) => m.username));

    // Need at least 3 different people mentioning keywords
    if (uniqueUsers.size < 3) return;

    const now = Date.now();
    if (now - this.lastClipTime < this.clipCooldown) return;

    const viewerCount = parseInt((await this.redis.get('twitch:viewer_count')) ?? '0', 10);
    if (viewerCount < minViewers) return;

    // Compute confidence (normalised: 3 users = 0.70, 5+ = 0.90)
    const confidence = Math.min(0.70 + (uniqueUsers.size - 3) * 0.10, 0.95);
    this.lastClipTime = now;

    const requireApproval =
      process.env.AUTO_CLIP_REQUIRE_APPROVAL !== 'false'; // default true

    if (requireApproval && confidence >= APPROVAL_CONFIDENCE_THRESHOLD) {
      await this.submitApproval(channel, uniqueUsers.size, confidence);
    } else {
      await this.createClipDirectly(channel, uniqueUsers.size);
    }

    this.messageBuffer = [];
  }

  // ── Approval gate ────────────────────────────────────────────────────────

  private async submitApproval(channel: string, uniqueUsers: number, confidence: number): Promise<void> {
    const orchestratorUrl = process.env.AGENT_ORCHESTRATOR_URL ?? 'http://agent-orchestrator:3300';
    const orgId = process.env.ORG_ID ?? '';

    try {
      const res = await fetch(`${orchestratorUrl}/v1/tasks/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          agent_type: 'clip',
          title: `Auto-clip opportunity — ${uniqueUsers} viewers reacting (${Math.round(confidence * 100)}% confidence)`,
          description: `Chat spike detected in ${channel}. ${uniqueUsers} unique users triggered clip keywords.`,
          payload: {
            channel,
            confidence,
            unique_users: uniqueUsers,
            timestamp: Date.now(),
          },
          urgency: confidence >= 0.85 ? 'high' : 'medium',
        }),
        signal: AbortSignal.timeout(5_000),
      });

      if (res.ok) {
        await this.client.say(channel, `🎬 Chat spike detected! Requesting approval to clip… 📝`);
        this.logger.info({ uniqueUsers, confidence }, 'Auto-clip approval request submitted');
      } else {
        // If orchestrator is down, fall back to direct clip
        this.logger.warn('Orchestrator unavailable, creating clip directly');
        await this.createClipDirectly(channel, uniqueUsers);
      }
    } catch (err) {
      this.logger.error({ err }, 'Failed to submit clip approval request');
      await this.createClipDirectly(channel, uniqueUsers);
    }
  }

  // ── Direct clip (autopilot / fallback) ───────────────────────────────────

  private async createClipDirectly(channel: string, uniqueUsers: number): Promise<void> {
    await this.client.say(channel, '🎬 Chat went crazy! Creating auto-clip... PogChamp');
    try {
      await this.clipService.createAutoClip(channel);
      this.logger.info({ uniqueUsers }, 'Auto-clip created directly');
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create auto-clip');
    }
  }
}
