/**
 * Social Ingest Service
 * Ingests and normalizes data from Discord, Twitch, YouTube, Twitter/X
 */
import Fastify from 'fastify';
import { config } from 'dotenv';
import pino from 'pino';
import { PrismaClient } from '@prisma/client';
import { createClient as createRedisClient } from 'redis';
import { DiscordIngestor } from './ingestion/discord';
import { TwitchIngestor } from './ingestion/twitch';
import { YouTubeIngestor } from './ingestion/youtube';
import { routes } from './api/routes';

config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const prisma = new PrismaClient();
const redis = createRedisClient({ url: process.env.REDIS_URL });

// Initialize Fastify
const fastify = Fastify({ logger });

// Initialize ingestors
let discordIngestor: DiscordIngestor | null = null;
let twitchIngestor: TwitchIngestor | null = null;
let youtubeIngestor: YouTubeIngestor | null = null;

async function start() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('✅ Connected to Redis');

    // Register API routes
    fastify.register(routes, { prisma, redis, logger });

    // Start Discord ingestor
    if (process.env.DISCORD_BOT_TOKEN) {
      discordIngestor = new DiscordIngestor(prisma, redis, logger);
      await discordIngestor.start();
      logger.info('✅ Discord ingestor started');
    }

    // Start Twitch ingestor
    if (process.env.TWITCH_OAUTH_TOKEN) {
      twitchIngestor = new TwitchIngestor(prisma, redis, logger);
      await twitchIngestor.start();
      logger.info('✅ Twitch ingestor started');
    }

    // Start YouTube ingestor
    if (process.env.YOUTUBE_API_KEY) {
      youtubeIngestor = new YouTubeIngestor(prisma, redis, logger);
      await youtubeIngestor.start();
      logger.info('✅ YouTube ingestor started');
    }

    // Start API server
    const port = parseInt(process.env.PORT || '8100');
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`✅ Social Ingest API running on port ${port}`);

  } catch (error) {
    logger.error({ err: error }, 'Failed to start service');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  if (discordIngestor) await discordIngestor.stop();
  if (twitchIngestor) await twitchIngestor.stop();
  if (youtubeIngestor) await youtubeIngestor.stop();

  await fastify.close();
  await redis.quit();
  await prisma.$disconnect();

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
