/**
 * Personality Engine
 * Core AI that generates responses in the creator's voice
 */
import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export class PersonalityEngine {
  private prisma: PrismaClient;
  private redis: RedisClientType;
  private logger: Logger;
  private openai?: OpenAI;
  private anthropic?: Anthropic;
  private provider: string;

  constructor(prisma: PrismaClient, redis: RedisClientType, logger: Logger) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
    this.provider = process.env.AI_PROVIDER || 'openai';
  }

  async initialize() {
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.logger.info('OpenAI initialized');
    } else if (this.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      this.logger.info('Anthropic Claude initialized');
    }
  }

  async generateResponse(userId: string, message: string, context?: any): Promise<string | null> {
    try {
      // Get personality profile
      const profile = await this.getOrCreateProfile(userId);

      // Get relevant memories
      const memories = await this.getRelevantMemories(userId, message);

      // Get recent conversation context
      const conversationHistory = await this.getConversationHistory(userId, context?.platform);

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(profile, memories);

      // Generate response
      let response: string;

      if (this.provider === 'openai' && this.openai) {
        response = await this.generateWithOpenAI(systemPrompt, conversationHistory, message);
      } else if (this.provider === 'anthropic' && this.anthropic) {
        response = await this.generateWithClaude(systemPrompt, conversationHistory, message);
      } else {
        throw new Error('No AI provider configured');
      }

      // Save conversation
      await this.saveConversation(userId, message, response, context);

      // Update usage stats
      await this.redis.hincrBy(`ai:stats:${userId}`, 'responses_generated', 1);

      return response;

    } catch (error) {
      this.logger.error({ err: error, userId }, 'Error generating response');
      return null;
    }
  }

  private async generateWithOpenAI(systemPrompt: string, history: any[], message: string): Promise<string> {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    const completion = await this.openai!.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages,
      temperature: parseFloat(process.env.PERSONALITY_TEMPERATURE || '0.8'),
      max_tokens: parseInt(process.env.PERSONALITY_MAX_TOKENS || '500'),
    });

    return completion.choices[0].message.content || '';
  }

  private async generateWithClaude(systemPrompt: string, history: any[], message: string): Promise<string> {
    const messages: any[] = [
      ...history,
      { role: 'user', content: message },
    ];

    const response = await this.anthropic!.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      max_tokens: parseInt(process.env.PERSONALITY_MAX_TOKENS || '500'),
      system: systemPrompt,
      messages,
      temperature: parseFloat(process.env.PERSONALITY_TEMPERATURE || '0.8'),
    });

    return (response.content[0] as any).text;
  }

  private buildSystemPrompt(profile: any, memories: any[]): string {
    const traits = profile.traits || {};
    const style = profile.writingStyle || {};

    let prompt = `You are an AI clone of ${profile.name}, a content creator. Your job is to respond EXACTLY as they would.\n\n`;

    prompt += `PERSONALITY TRAITS:\n`;
    for (const [trait, value] of Object.entries(traits)) {
      prompt += `- ${trait}: ${value}\n`;
    }

    prompt += `\nWRITING STYLE:\n`;
    prompt += `- Tone: ${profile.tone || 'casual and friendly'}\n`;
    prompt += `- Response length: ${profile.responseLength || 'medium'}\n`;
    prompt += `- Common vocabulary: ${profile.vocabulary?.slice(0, 20).join(', ') || 'N/A'}\n`;

    if (profile.catchphrases && profile.catchphrases.length > 0) {
      prompt += `- Catchphrases: ${profile.catchphrases.join(', ')}\n`;
    }

    if (profile.emojiPreference && profile.emojiPreference.length > 0) {
      prompt += `- Emoji usage: ${profile.emojiPreference.slice(0, 10).join(' ')}\n`;
    }

    prompt += `\nKEY MEMORIES:\n`;
    memories.slice(0, 10).forEach(mem => {
      prompt += `- ${mem.content}\n`;
    });

    prompt += `\nGUIDELINES:\n`;
    prompt += `- Stay in character at all times\n`;
    prompt += `- Use natural, conversational language\n`;
    prompt += `- Be authentic and genuine\n`;
    prompt += `- Match the creator's humor and style\n`;

    if (process.env.CONTROVERSY_AVOIDANCE === 'true') {
      prompt += `- Avoid controversial topics unless specifically asked\n`;
      prompt += `- Stay positive and constructive\n`;
    }

    if (profile.avoidedTopics && profile.avoidedTopics.length > 0) {
      prompt += `- Avoid discussing: ${profile.avoidedTopics.join(', ')}\n`;
    }

    return prompt;
  }

  private async getOrCreateProfile(userId: string) {
    let profile = await this.prisma.personalityProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.personalityProfile.create({
        data: {
          userId,
          name: 'Creator',
          platform: 'twitch',
        },
      });
    }

    return profile;
  }

  private async getRelevantMemories(userId: string, message: string) {
    // Get most important and recently accessed memories
    const memories = await this.prisma.memory.findMany({
      where: { userId },
      orderBy: [
        { importance: 'desc' },
        { lastAccessedAt: 'desc' },
      ],
      take: 10,
    });

    // Update access count and timestamp
    for (const memory of memories) {
      await this.prisma.memory.update({
        where: { id: memory.id },
        data: {
          lastAccessedAt: new Date(),
          accessCount: { increment: 1 },
        },
      });
    }

    return memories;
  }

  private async getConversationHistory(userId: string, platform?: string) {
    const contextWindow = parseInt(process.env.CONTEXT_WINDOW || '20');

    const conversations = await this.prisma.conversation.findMany({
      where: {
        userId,
        ...(platform && { platform }),
      },
      orderBy: { createdAt: 'desc' },
      take: contextWindow,
    });

    return conversations.reverse().map(conv => ({
      role: conv.role,
      content: conv.content,
    }));
  }

  private async saveConversation(userId: string, userMessage: string, aiResponse: string, context?: any) {
    // Save user message
    await this.prisma.conversation.create({
      data: {
        userId,
        platform: context?.platform || 'unknown',
        platformUserId: context?.platformUserId || 'unknown',
        platformUsername: context?.username,
        role: 'user',
        content: userMessage,
        channelId: context?.channelId,
      },
    });

    // Save AI response
    await this.prisma.conversation.create({
      data: {
        userId,
        platform: context?.platform || 'unknown',
        platformUserId: 'ai',
        role: 'assistant',
        content: aiResponse,
        wasAIGenerated: true,
        model: this.provider,
        channelId: context?.channelId,
      },
    });
  }

  async learnFromMessage(userId: string, message: string, metadata?: any) {
    // Add to training data
    await this.prisma.trainingData.create({
      data: {
        userId,
        platform: metadata?.platform || 'unknown',
        dataType: 'message',
        content: message,
        metadata: metadata || {},
      },
    });

    // Update message count
    await this.prisma.personalityProfile.update({
      where: { userId },
      data: {
        messagesSeen: { increment: 1 },
      },
    });
  }
}
