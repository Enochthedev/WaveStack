/**
 * NLP Responder
 * Decides whether the bot should respond to a chat message and, if so,
 * generates a natural language reply via the model-router.
 *
 * The bot responds to:
 *   - Direct @mention
 *   - Questions directed at the channel (question_for_streamer)
 *   - High-engagement moments (hype spikes) — handled by HypeReporter separately
 *
 * It does NOT respond to every message — that would be spammy.
 * Rate-limiting: max 1 NLP response per 8 seconds per channel.
 */
import { Logger } from 'pino';
import type { RedisClientType } from 'redis';
import { MessageCategory } from './message-classifier';

const MODEL_ROUTER_URL   = process.env.MODEL_ROUTER_URL    ?? 'http://model-router:3700';
const INTERNAL_SECRET    = process.env.INTERNAL_SERVICE_SECRET ?? '';
const NLP_COOLDOWN_MS    = 8_000;   // min gap between bot replies
const NLP_QUESTION_RATE  = 0.35;    // only answer 35% of questions (avoid spam)
const BOT_USERNAME       = (process.env.TWITCH_BOT_USERNAME ?? '').toLowerCase();

export interface NlpReply {
  shouldRespond: boolean;
  response?: string;
}

export class NlpResponder {
  constructor(
    private readonly redis: RedisClientType,
    private readonly logger: Logger,
  ) {}

  async maybeRespond(opts: {
    orgId:    string;
    channel:  string;
    username: string;
    message:  string;
    category: MessageCategory;
    chatHistory?: Array<{ role: string; content: string }>;
  }): Promise<NlpReply> {
    const { orgId, channel, username, message, category, chatHistory } = opts;

    // ── Decide whether to respond ─────────────────────────────────────────
    const isMentioned = message.toLowerCase().includes(`@${BOT_USERNAME}`);
    const isQuestion  = category === 'question_for_streamer';

    if (!isMentioned && !isQuestion) {
      return { shouldRespond: false };
    }

    // Probabilistic gate for questions (avoid answering every question)
    if (isQuestion && !isMentioned && Math.random() > NLP_QUESTION_RATE) {
      return { shouldRespond: false };
    }

    // ── Rate limit: one reply per channel per cooldown window ─────────────
    const cooldownKey = `twitch:nlp:cooldown:${channel}`;
    const locked = await this.redis.get(cooldownKey);
    if (locked) {
      this.logger.debug({ channel }, '[nlp] cooldown active, skipping');
      return { shouldRespond: false };
    }
    await this.redis.set(cooldownKey, '1', { PX: NLP_COOLDOWN_MS });

    // ── Generate response via model-router ────────────────────────────────
    try {
      const response = await this.generate(orgId, username, message, chatHistory);
      if (!response) return { shouldRespond: false };
      return { shouldRespond: true, response };
    } catch (err) {
      this.logger.warn({ err }, '[nlp] model-router call failed');
      return { shouldRespond: false };
    }
  }

  private async generate(
    orgId: string,
    username: string,
    message: string,
    history?: Array<{ role: string; content: string }>,
  ): Promise<string | null> {
    const prompt = `Twitch chat message from @${username}: "${message}"\nReply in 1-2 short sentences, naturally and in-character as the streamer's AI assistant. Keep it conversational, no hashtags.`;

    const res = await fetch(`${MODEL_ROUTER_URL}/v1/route`, {
      method:  'POST',
      headers: {
        'Content-Type':       'application/json',
        'x-internal-service': INTERNAL_SECRET,
      },
      body: JSON.stringify({
        task_type: 'chat_response',
        org_id:    orgId,
        prompt,
        platform:  'twitch',
        context: {
          system_prompt: 'You are the streamer\'s helpful AI assistant in a Twitch chat. Keep replies short (1-2 sentences), friendly, and relevant to the message. Never be toxic.',
          history: history?.slice(-10) ?? [],
        },
      }),
      signal: AbortSignal.timeout(6_000),
    });

    if (!res.ok) {
      this.logger.warn({ status: res.status }, '[nlp] model-router non-ok response');
      return null;
    }

    const data = await res.json() as { response: string };
    return data.response?.trim() || null;
  }
}
