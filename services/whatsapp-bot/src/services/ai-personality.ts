/**
 * AI Personality Integration for WhatsApp
 */
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import axios from 'axios';

const AI_API = process.env.AI_PERSONALITY_URL || 'http://ai-personality:8200';

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
    context?: any
  ): Promise<string | null> {
    try {
      const response = await axios.post(`${AI_API}/api/v1/personality/respond`, {
        user_id: userId,
        message,
        platform: 'whatsapp',
        context,
      });

      return response.data.response;
    } catch (error: any) {
      this.logger.error({ err: error }, 'Error generating AI response');
      return null;
    }
  }
}
