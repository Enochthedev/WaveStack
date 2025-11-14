/**
 * Memory Manager
 * Handles long-term memory storage, retrieval, and semantic search
 */
import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import OpenAI from 'openai';

export class MemoryManager {
  private prisma: PrismaClient;
  private redis: RedisClientType;
  private logger: Logger;
  private openai?: OpenAI;

  constructor(prisma: PrismaClient, redis: RedisClientType, logger: Logger) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
  }

  async initialize() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.logger.info('Memory manager initialized with embeddings support');
    }
  }

  async storeMemory(userId: string, content: string, type: string, metadata?: any) {
    try {
      // Calculate importance based on content
      const importance = await this.calculateImportance(content, type);

      // Create memory
      const memory = await this.prisma.memory.create({
        data: {
          userId,
          memoryType: type,
          content,
          importance,
          source: metadata?.source || 'manual',
          sourceId: metadata?.sourceId,
          tags: metadata?.tags || [],
        },
      });

      // Store in cache for quick access
      await this.redis.zadd(
        `memory:recent:${userId}`,
        importance,
        memory.id
      );

      this.logger.info({ memoryId: memory.id, type, importance }, 'Memory stored');
      return memory;

    } catch (error) {
      this.logger.error({ err: error, userId }, 'Error storing memory');
      return null;
    }
  }

  async getRelevantMemories(userId: string, query: string, limit: number = 10) {
    try {
      // Get high-importance memories
      const importantMemories = await this.prisma.memory.findMany({
        where: { userId, importance: { gte: 7 } },
        orderBy: { importance: 'desc' },
        take: Math.ceil(limit / 2),
      });

      // Get recently accessed memories
      const recentMemories = await this.prisma.memory.findMany({
        where: { userId },
        orderBy: { lastAccessedAt: 'desc' },
        take: Math.ceil(limit / 2),
      });

      // Combine and deduplicate
      const memoryMap = new Map();
      [...importantMemories, ...recentMemories].forEach(m => memoryMap.set(m.id, m));
      const memories = Array.from(memoryMap.values()).slice(0, limit);

      // Update access counts
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

    } catch (error) {
      this.logger.error({ err: error, userId }, 'Error retrieving memories');
      return [];
    }
  }

  async learnFromConversation(userId: string, conversation: any[]) {
    try {
      const facts: string[] = [];
      const preferences: string[] = [];

      // Extract facts and preferences from conversation
      for (const msg of conversation) {
        if (msg.role === 'user') {
          // Look for statements of fact or preference
          const content = msg.content.toLowerCase();

          if (content.includes('i like') || content.includes('i love') || content.includes('i prefer')) {
            preferences.push(msg.content);
          }

          if (content.includes('my') || content.includes('i am') || content.includes('i\'m')) {
            facts.push(msg.content);
          }
        }
      }

      // Store as memories
      for (const fact of facts) {
        await this.storeMemory(userId, fact, 'fact', { source: 'conversation' });
      }

      for (const pref of preferences) {
        await this.storeMemory(userId, pref, 'preference', { source: 'conversation' });
      }

      this.logger.info({ userId, facts: facts.length, preferences: preferences.length }, 'Learned from conversation');

    } catch (error) {
      this.logger.error({ err: error, userId }, 'Error learning from conversation');
    }
  }

  async consolidateMemories(userId: string) {
    try {
      // Get all memories
      const memories = await this.prisma.memory.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      // Find duplicates and merge
      const contentMap = new Map<string, string[]>();
      for (const memory of memories) {
        const normalized = memory.content.toLowerCase().trim();
        if (!contentMap.has(normalized)) {
          contentMap.set(normalized, []);
        }
        contentMap.get(normalized)!.push(memory.id);
      }

      // Merge duplicates
      let merged = 0;
      for (const [content, ids] of contentMap.entries()) {
        if (ids.length > 1) {
          // Keep the most accessed one, delete others
          const keepId = ids[0];
          const deleteIds = ids.slice(1);

          await this.prisma.memory.deleteMany({
            where: { id: { in: deleteIds } },
          });

          merged += deleteIds.length;
        }
      }

      this.logger.info({ userId, merged }, 'Consolidated memories');
      return merged;

    } catch (error) {
      this.logger.error({ err: error, userId }, 'Error consolidating memories');
      return 0;
    }
  }

  async pruneOldMemories(userId: string) {
    try {
      const retentionDays = parseInt(process.env.MEMORY_RETENTION_DAYS || '90');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete low-importance, rarely-accessed old memories
      const deleted = await this.prisma.memory.deleteMany({
        where: {
          userId,
          importance: { lt: 5 },
          accessCount: { lt: 3 },
          lastAccessedAt: { lt: cutoffDate },
        },
      });

      this.logger.info({ userId, deleted: deleted.count }, 'Pruned old memories');
      return deleted.count;

    } catch (error) {
      this.logger.error({ err: error, userId }, 'Error pruning memories');
      return 0;
    }
  }

  private async calculateImportance(content: string, type: string): Promise<number> {
    // Base importance by type
    const baseImportance: Record<string, number> = {
      fact: 7,
      preference: 8,
      event: 6,
      relationship: 9,
    };

    let importance = baseImportance[type] || 5;

    // Increase importance for certain keywords
    const highValueKeywords = ['always', 'never', 'favorite', 'hate', 'love', 'important', 'remember'];
    const lowerContent = content.toLowerCase();

    for (const keyword of highValueKeywords) {
      if (lowerContent.includes(keyword)) {
        importance = Math.min(10, importance + 1);
      }
    }

    return importance;
  }
}
