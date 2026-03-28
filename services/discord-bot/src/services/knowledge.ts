/**
 * Knowledge Service
 * Queries the WaveStack knowledge service for RAG-based Q&A answers.
 * Used by the Discord bot to answer community questions with grounded
 * context from the streamer's indexed documents and VOD transcripts.
 */
import { Logger } from 'pino';

const TRIGGER_PREFIXES = ['!ask ', '!q ', '?? '];
const MAX_ANSWER_LENGTH = 1_800; // Discord message limit is 2000

export interface KnowledgeAnswer {
  answer: string;
  sources: string[];
  confidence: number;
}

export class KnowledgeService {
  private readonly knowledgeUrl: string;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.knowledgeUrl = process.env.KNOWLEDGE_SERVICE_URL ?? 'http://knowledge:3900';
    this.logger = logger;
  }

  /** Returns true if the message is a knowledge query. */
  static isKnowledgeQuery(message: string): boolean {
    const lower = message.toLowerCase();
    return TRIGGER_PREFIXES.some((p) => lower.startsWith(p));
  }

  /** Extracts the question text from the message. */
  static extractQuery(message: string): string {
    for (const prefix of TRIGGER_PREFIXES) {
      if (message.toLowerCase().startsWith(prefix)) {
        return message.slice(prefix.length).trim();
      }
    }
    return message.trim();
  }

  async query(question: string, orgId?: string): Promise<KnowledgeAnswer | null> {
    try {
      const res = await fetch(`${this.knowledgeUrl}/v1/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          org_id: orgId ?? process.env.ORG_ID ?? '',
          top_k: 3,
        }),
        signal: AbortSignal.timeout(10_000), // knowledge queries can take a bit longer
      });

      if (!res.ok) {
        this.logger.warn({ status: res.status }, '[knowledge] non-ok response');
        return null;
      }

      const data = await res.json() as {
        answer: string;
        sources?: string[];
        confidence?: number;
      };

      return {
        answer: data.answer?.slice(0, MAX_ANSWER_LENGTH) ?? 'No answer found.',
        sources: data.sources ?? [],
        confidence: data.confidence ?? 0,
      };
    } catch (err) {
      this.logger.error({ err }, '[knowledge] query failed');
      return null;
    }
  }

  /** Format the answer for a Discord message reply. */
  static formatReply(answer: KnowledgeAnswer, question: string): string {
    const sourceText =
      answer.sources.length > 0
        ? `\n\n*Sources: ${answer.sources.slice(0, 2).join(', ')}*`
        : '';

    return `> ${question}\n\n${answer.answer}${sourceText}`;
  }
}
