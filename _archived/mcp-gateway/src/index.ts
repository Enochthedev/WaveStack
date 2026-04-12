import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env';
import { logger } from './shared/logger';
import { db } from './shared/db';
import { redis } from './shared/redis';
import routes from './api/routes';

const app = Fastify({
  logger: logger,
  disableRequestLogging: true,
  bodyLimit: 1_048_576,
  requestTimeout: 30_000,
});

// ── Request logging ──
app.addHook('onRequest', (req, _reply, done) => {
  req.log.info({ req: { method: req.method, url: req.url } }, 'Incoming request');
  done();
});

app.addHook('onResponse', (req, reply, done) => {
  req.log.info({ res: { statusCode: reply.statusCode } }, 'Request completed');
  done();
});

// ── Error handler ──
app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({ error: 'Validation Error', details: error.issues });
  }
  request.log.error(error);
  return reply.status(500).send({ error: 'Internal Server Error' });
});

// ── Health Check ──
app.get('/health', async (request, reply) => {
  try {
    await db.$queryRaw`SELECT 1`;
    await redis.ping();
    return { status: 'ok', service: 'mcp-gateway', timestamp: new Date().toISOString() };
  } catch (error) {
    request.log.error(error, 'Health check failed');
    return reply.status(503).send({ status: 'error', reason: 'Dependencies unavailable' });
  }
});

app.get('/ready', async () => ({ status: 'ok' }));

// ── API Routes ──
app.register(routes);

// ── Start ──
const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`MCP Gateway listening on port ${env.PORT}`);
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
