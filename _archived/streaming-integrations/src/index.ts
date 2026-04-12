import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import Redis from 'ioredis';
import pino from 'pino';
import { StreamElementsIntegration } from './streamelements';
import { StreamlabsIntegration } from './streamlabs';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = Fastify({ logger });
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
const PORT = parseInt(process.env.PORT || '3600');

await app.register(cors, { origin: true });

// Active connections per org
const seConnections = new Map<string, StreamElementsIntegration>();
const slConnections = new Map<string, StreamlabsIntegration>();

function forwardEvent(orgId: string, platform: string, type: string, data: unknown) {
  const payload = JSON.stringify({ orgId, platform, type, data, ts: Date.now() });
  redis.publish(`streaming:events:${orgId}`, payload).catch(() => {});
  redis.lpush(`streaming:history:${orgId}`, payload).catch(() => {});
  redis.ltrim(`streaming:history:${orgId}`, 0, 499).catch(() => {});
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'streaming-integrations' }));

// ── Connect StreamElements ────────────────────────────────────────────────────
app.post<{ Body: { orgId: string; accountId: string; jwtToken: string } }>(
  '/api/v1/streamelements/connect',
  async (req, reply) => {
    const { orgId, accountId, jwtToken } = req.body;
    if (!orgId || !accountId || !jwtToken)
      return reply.code(400).send({ error: 'MISSING_FIELDS', message: 'orgId, accountId, jwtToken required' });

    if (seConnections.has(orgId)) {
      seConnections.get(orgId)!.disconnect();
    }

    const se = new StreamElementsIntegration(accountId, jwtToken, logger as any);
    ['tip', 'subscriber', 'follow', 'cheer', 'host', 'raid', 'test'].forEach((evt) =>
      se.on(evt, (data) => forwardEvent(orgId, 'streamelements', evt, data)),
    );
    await se.connect();
    seConnections.set(orgId, se);

    return { connected: true, platform: 'streamelements', orgId };
  },
);

// ── Disconnect StreamElements ─────────────────────────────────────────────────
app.delete<{ Params: { orgId: string } }>('/api/v1/streamelements/:orgId', async (req, reply) => {
  const se = seConnections.get(req.params.orgId);
  if (!se) return reply.code(404).send({ error: 'NOT_CONNECTED' });
  se.disconnect();
  seConnections.delete(req.params.orgId);
  reply.code(204);
});

// ── Connect Streamlabs ────────────────────────────────────────────────────────
app.post<{ Body: { orgId: string; token: string } }>(
  '/api/v1/streamlabs/connect',
  async (req, reply) => {
    const { orgId, token } = req.body;
    if (!orgId || !token)
      return reply.code(400).send({ error: 'MISSING_FIELDS', message: 'orgId, token required' });

    if (slConnections.has(orgId)) {
      slConnections.get(orgId)!.disconnect();
    }

    const sl = new StreamlabsIntegration(token, logger as any);
    ['donation', 'follow', 'subscription', 'bits'].forEach((evt) =>
      sl.on(evt, (data) => forwardEvent(orgId, 'streamlabs', evt, data)),
    );
    sl.connect();
    slConnections.set(orgId, sl);

    return { connected: true, platform: 'streamlabs', orgId };
  },
);

// ── Disconnect Streamlabs ─────────────────────────────────────────────────────
app.delete<{ Params: { orgId: string } }>('/api/v1/streamlabs/:orgId', async (req, reply) => {
  const sl = slConnections.get(req.params.orgId);
  if (!sl) return reply.code(404).send({ error: 'NOT_CONNECTED' });
  sl.disconnect();
  slConnections.delete(req.params.orgId);
  reply.code(204);
});

// ── Status ────────────────────────────────────────────────────────────────────
app.get('/api/v1/status', async () => ({
  streamelements: Array.from(seConnections.keys()),
  streamlabs: Array.from(slConnections.keys()),
}));

// ── Recent events for an org ──────────────────────────────────────────────────
app.get<{ Params: { orgId: string }; Querystring: { limit?: string } }>(
  '/api/v1/events/:orgId',
  async (req, reply) => {
    const limit = Math.min(parseInt(req.query.limit || '50'), 200);
    const raw = await redis.lrange(`streaming:history:${req.params.orgId}`, 0, limit - 1);
    return { events: raw.map((r) => JSON.parse(r)) };
  },
);

// ── StreamElements REST helpers ───────────────────────────────────────────────
app.get<{ Params: { orgId: string } }>('/api/v1/streamelements/:orgId/tips', async (req, reply) => {
  const se = seConnections.get(req.params.orgId);
  if (!se) return reply.code(404).send({ error: 'NOT_CONNECTED' });
  return se.getTips();
});

app.get<{ Params: { orgId: string } }>('/api/v1/streamelements/:orgId/store', async (req, reply) => {
  const se = seConnections.get(req.params.orgId);
  if (!se) return reply.code(404).send({ error: 'NOT_CONNECTED' });
  return se.getStore();
});

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  logger.info(`streaming-integrations listening on port ${PORT}`);
} catch (err) {
  logger.error(err);
  process.exit(1);
}
