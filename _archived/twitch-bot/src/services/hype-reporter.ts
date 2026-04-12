/**
 * Hype Reporter
 * Sends stream metadata (chat_rate, viewer_count) to the stream-engine
 * service on a fixed interval so the hype score stays up-to-date.
 *
 * The stream-engine accumulates these alongside audio_rms from the
 * desktop app to compute a composite hype score.
 */
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

const REPORT_INTERVAL_MS = 5_000; // 5-second cadence per CLAUDE.md spec

interface StreamMetrics {
  org_id: string;
  chat_rate: number;       // messages per second over the last window
  viewer_delta: number;    // change in viewer count (positive = gaining)
  audio_rms: number;       // desktop app provides this; bot sends 0 as placeholder
}

export class HypeReporter {
  private readonly streamEngineUrl: string;
  private readonly redis: RedisClientType;
  private readonly logger: Logger;
  private readonly orgId: string;

  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private messageCount = 0;
  private lastViewerCount = 0;
  private windowStart = Date.now();

  constructor(redis: RedisClientType, logger: Logger) {
    this.streamEngineUrl = process.env.STREAM_ENGINE_URL ?? 'http://stream-engine:3400';
    this.redis = redis;
    this.logger = logger;
    this.orgId = process.env.ORG_ID ?? 'default';
  }

  /** Call this every time a chat message arrives to increment the rate counter. */
  tick(): void {
    this.messageCount++;
  }

  start(): void {
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(() => void this.report(), REPORT_INTERVAL_MS);
    this.logger.info('[hype-reporter] started (interval=%dms)', REPORT_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private async report(): Promise<void> {
    try {
      const now = Date.now();
      const elapsedSec = (now - this.windowStart) / 1_000;
      const chatRate = elapsedSec > 0 ? this.messageCount / elapsedSec : 0;

      // Reset window
      this.messageCount = 0;
      this.windowStart = now;

      const viewerCount = parseInt((await this.redis.get('twitch:viewer_count')) ?? '0', 10);
      const viewerDelta = viewerCount - this.lastViewerCount;
      this.lastViewerCount = viewerCount;

      const payload: StreamMetrics = {
        org_id: this.orgId,
        chat_rate: chatRate,
        viewer_delta: viewerDelta,
        audio_rms: 0, // desktop app fills this in separately
      };

      await fetch(`${this.streamEngineUrl}/v1/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'metrics',
          org_id: this.orgId,
          data: payload,
        }),
        signal: AbortSignal.timeout(3_000),
      });

      this.logger.debug({ chatRate, viewerDelta }, '[hype-reporter] metrics sent');
    } catch (err) {
      this.logger.warn({ err }, '[hype-reporter] failed to send metrics');
    }
  }
}
