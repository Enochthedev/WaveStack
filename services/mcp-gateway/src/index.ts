import Fastify from 'fastify';
import { env } from './config/env';
import { logger } from './shared/logger';
import { db } from './shared/db';
import { redis } from './shared/redis';

const app = Fastify({
  logger: logger,
  disableRequestLogging: true,
});

app.addHook('onRequest', (req, reply, done) => {
  req.log.info({ req: { method: req.method, url: req.url } }, 'Incoming request');
  done();
});

app.addHook('onResponse', (req, reply, done) => {
  req.log.info({ res: { statusCode: reply.statusCode } }, 'Request completed');
  done();
});

// Basic Health Check
app.get('/health', async (request, reply) => {
  try {
    // Check DB and Redis
    await db.$queryRaw`SELECT 1`;
    await redis.ping();
    return { status: 'ok', timestamp: new Date().toISOString() };
  } catch (error) {
    request.log.error(error, 'Health check failed');
    return reply.status(503).send({ status: 'error', reason: 'Dependencies unavailable' });
  }
});

const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`🚀 MCP Gateway listening on port ${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  await app.close();
  await db.$disconnect();
  redis.disconnect();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
