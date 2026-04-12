/**
 * Social Ingest API Routes
 */
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export async function routes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions & { prisma: PrismaClient; redis: RedisClientType; logger: Logger }
) {
  const { prisma, redis, logger } = options;

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Get recent messages
  fastify.get('/api/v1/messages', async (request, reply) => {
    const { platform, channelId, userId, limit = 100, offset = 0 } = request.query as any;

    const where: any = {};
    if (platform) where.platform = platform;
    if (channelId) where.channelId = channelId;
    if (userId) where.userId = userId;

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    return { messages, count: messages.length };
  });

  // Get events
  fastify.get('/api/v1/events', async (request, reply) => {
    const { platform, eventType, channelId, limit = 100 } = request.query as any;

    const where: any = {};
    if (platform) where.platform = platform;
    if (eventType) where.eventType = eventType;
    if (channelId) where.channelId = channelId;

    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    return { events, count: events.length };
  });

  // Get user analytics
  fastify.get('/api/v1/analytics/user/:userId', async (request, reply) => {
    const { userId } = request.params as any;
    const { platform } = request.query as any;

    const analytics = await prisma.userAnalytics.findUnique({
      where: {
        platform_userId: {
          platform: platform || 'twitch',
          userId,
        },
      },
    });

    if (!analytics) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return analytics;
  });

  // Get channel analytics
  fastify.get('/api/v1/analytics/channel/:channelId', async (request, reply) => {
    const { channelId } = request.params as any;
    const { platform, date } = request.query as any;

    const analytics = await prisma.channelAnalytics.findUnique({
      where: {
        platform_channelId_date: {
          platform: platform || 'twitch',
          channelId,
          date: date ? new Date(date) : new Date(),
        },
      },
    });

    return analytics || { message: 'No data for this date' };
  });

  // Search messages
  fastify.get('/api/v1/search', async (request, reply) => {
    const { q, platform, channelId, limit = 50 } = request.query as any;

    if (!q) {
      return reply.code(400).send({ error: 'Query parameter "q" is required' });
    }

    const where: any = {
      content: { contains: q, mode: 'insensitive' },
    };

    if (platform) where.platform = platform;
    if (channelId) where.channelId = channelId;

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    return { messages, count: messages.length, query: q };
  });

  // Leaderboard
  fastify.get('/api/v1/leaderboard', async (request, reply) => {
    const { platform, metric = 'messageCount', limit = 10 } = request.query as any;

    const where: any = {};
    if (platform) where.platform = platform;

    const leaderboard = await prisma.userAnalytics.findMany({
      where,
      orderBy: { [metric]: 'desc' },
      take: parseInt(limit),
    });

    return { leaderboard, metric, count: leaderboard.length };
  });
}
