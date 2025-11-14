/**
 * AI Personality Service
 * Creates a digital clone that learns from the user and responds in their voice
 */
import Fastify from 'fastify';
import { config } from 'dotenv';
import pino from 'pino';
import { PrismaClient } from '@prisma/client';
import { createClient as createRedisClient } from 'redis';
import { PersonalityEngine } from './engine/personality';
import { MemoryManager } from './engine/memory';
import { ContentGenerator } from './engine/content-generator';
import { LearningPipeline } from './engine/learning-pipeline';
import { routes } from './api/routes';

config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const prisma = new PrismaClient();
const redis = createRedisClient({ url: process.env.REDIS_URL });

// Initialize Fastify
const fastify = Fastify({ logger });

// Initialize AI services
let personalityEngine: PersonalityEngine;
let memoryManager: MemoryManager;
let contentGenerator: ContentGenerator;
let learningPipeline: LearningPipeline;

async function start() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('✅ Connected to Redis');

    // Initialize AI components
    personalityEngine = new PersonalityEngine(prisma, redis, logger);
    await personalityEngine.initialize();
    logger.info('✅ Personality engine initialized');

    memoryManager = new MemoryManager(prisma, redis, logger);
    await memoryManager.initialize();
    logger.info('✅ Memory manager initialized');

    contentGenerator = new ContentGenerator(prisma, redis, logger, personalityEngine);
    logger.info('✅ Content generator initialized');

    learningPipeline = new LearningPipeline(prisma, redis, logger, personalityEngine, memoryManager);
    await learningPipeline.start();
    logger.info('✅ Learning pipeline started');

    // Register API routes
    fastify.register(routes, {
      prisma,
      redis,
      logger,
      personalityEngine,
      memoryManager,
      contentGenerator,
    });

    // Start API server
    const port = parseInt(process.env.PORT || '8200');
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`✅ AI Personality API running on port ${port}`);

  } catch (error) {
    logger.error({ err: error }, 'Failed to start AI Personality service');
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  if (learningPipeline) await learningPipeline.stop();

  await fastify.close();
  await redis.quit();
  await prisma.$disconnect();

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
