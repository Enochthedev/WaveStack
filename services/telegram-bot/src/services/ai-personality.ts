import type { Logger } from 'pino';
import type { RedisClientType } from 'redis';
import axios from 'axios';

const AI_PERSONALITY_URL =
  process.env.AI_PERSONALITY_URL || 'http://ai-personality:8200';

interface ResponseContext {
  platform: string;
  chatId: string;
  username?: string;
}

export class AIPersonality {
  private redis: RedisClientType;
  private logger: Logger;

  constructor(redis: RedisClientType, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
  }

  async generateResponse(
    userId: string,
    message: string,
    context: ResponseContext,
  ): Promise<string | null> {
    try {
      const response = await axios.post(
        `${AI_PERSONALITY_URL}/api/v1/generate`,
        {
          userId,
          message,
          platform: context.platform,
          chatId: context.chatId,
          username: context.username,
        },
        { timeout: 10_000 },
      );

      return response.data?.reply ?? null;
    } catch (error) {
      this.logger.error({ err: error }, 'AI personality request failed');
      return null;
    }
  }
}
