/**
 * Message Classifier
 * Classifies Twitch chat messages into four categories:
 *   - command            (starts with ! or /)
 *   - spam_or_toxicity   (blocked by moderation)
 *   - question_for_streamer
 *   - community_chat
 *
 * Calls the auto-mod /classify endpoint; falls back to a lightweight
 * heuristic if the service is unavailable.
 */
import { Logger } from 'pino';

export type MessageCategory =
  | 'command'
  | 'spam_or_toxicity'
  | 'question_for_streamer'
  | 'community_chat';

export interface ClassifyResult {
  category: MessageCategory;
  confidence: number;
}

export class MessageClassifier {
  private readonly autoModUrl: string;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.autoModUrl = process.env.AUTO_MOD_URL ?? 'http://auto-mod:8700';
    this.logger = logger;
  }

  async classify(message: string, username?: string): Promise<ClassifyResult> {
    try {
      const res = await fetch(`${this.autoModUrl}/api/v1/moderate/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, username }),
        signal: AbortSignal.timeout(2_000), // 2s timeout — must not block chat
      });

      if (res.ok) {
        const data = await res.json() as ClassifyResult;
        this.logger.debug({ category: data.category, confidence: data.confidence }, '[classifier] result');
        return data;
      }
    } catch (err) {
      this.logger.warn({ err }, '[classifier] auto-mod unreachable, using fallback');
    }

    // Fast local fallback
    return this.fallback(message);
  }

  private fallback(message: string): ClassifyResult {
    const text = message.trim();
    if (text.startsWith('!') || text.startsWith('/')) {
      return { category: 'command', confidence: 0.99 };
    }
    if (text.includes('?')) {
      return { category: 'question_for_streamer', confidence: 0.65 };
    }
    return { category: 'community_chat', confidence: 0.75 };
  }
}
