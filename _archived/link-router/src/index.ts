import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });

const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3500';
const LINK_TTL = parseInt(process.env.LINK_TTL_DAYS || '365') * 86400;
const PORT = parseInt(process.env.PORT || '3500');

await app.register(cors, { origin: true });
await app.register(rateLimit, { max: 100, timeWindow: '1 minute' });

// ── Health ──────────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'link-router' }));

// ── Shorten a URL ────────────────────────────────────────────────────────────
// POST /api/v1/links  { url, slug?, orgId?, campaignId?, ttlDays? }
app.post<{ Body: { url: string; slug?: string; orgId?: string; campaignId?: string; ttlDays?: number } }>(
  '/api/v1/links',
  async (req, reply) => {
    const { url, slug, orgId, campaignId, ttlDays } = req.body;
    if (!url) return reply.code(400).send({ error: 'MISSING_URL', message: 'url is required' });

    let shortCode = slug || nanoid();

    // Reject if custom slug is taken
    if (slug) {
      const existing = await redis.get(`link:${slug}`);
      if (existing) return reply.code(409).send({ error: 'SLUG_TAKEN', message: 'This slug is already in use' });
    }

    const entry = JSON.stringify({ url, orgId, campaignId, createdAt: new Date().toISOString(), clicks: 0 });
    const ttl = (ttlDays ?? 365) * 86400;

    await redis.setex(`link:${shortCode}`, ttl, entry);

    // Index by org if provided
    if (orgId) await redis.lpush(`org:${orgId}:links`, shortCode);

    reply.code(201);
    return { shortCode, shortUrl: `${BASE_URL}/r/${shortCode}`, url };
  },
);

// ── Redirect ─────────────────────────────────────────────────────────────────
app.get<{ Params: { code: string } }>('/r/:code', async (req, reply) => {
  const raw = await redis.get(`link:${req.params.code}`);
  if (!raw) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Link not found or expired' });

  const entry = JSON.parse(raw);

  // Async click tracking — fire and forget
  entry.clicks = (entry.clicks || 0) + 1;
  redis.setex(`link:${req.params.code}`, LINK_TTL, JSON.stringify(entry)).catch(() => {});
  redis.lpush(`link:${req.params.code}:events`, JSON.stringify({
    ts: Date.now(),
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
  })).catch(() => {});
  redis.ltrim(`link:${req.params.code}:events`, 0, 999).catch(() => {});

  return reply.redirect(entry.url, 302);
});

// ── Get link stats ────────────────────────────────────────────────────────────
app.get<{ Params: { code: string } }>('/api/v1/links/:code', async (req, reply) => {
  const raw = await redis.get(`link:${req.params.code}`);
  if (!raw) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Link not found' });
  return { shortCode: req.params.code, ...JSON.parse(raw) };
});

// ── List org links ────────────────────────────────────────────────────────────
app.get<{ Querystring: { orgId: string; limit?: string; offset?: string } }>(
  '/api/v1/links',
  async (req, reply) => {
    const { orgId, limit = '50', offset = '0' } = req.query;
    if (!orgId) return reply.code(400).send({ error: 'MISSING_ORG', message: 'orgId is required' });

    const start = parseInt(offset);
    const end = start + parseInt(limit) - 1;
    const codes = await redis.lrange(`org:${orgId}:links`, start, end);

    const links = await Promise.all(
      codes.map(async (code) => {
        const raw = await redis.get(`link:${code}`);
        return raw ? { shortCode: code, shortUrl: `${BASE_URL}/r/${code}`, ...JSON.parse(raw) } : null;
      }),
    );

    return { links: links.filter(Boolean), offset: start, limit: parseInt(limit) };
  },
);

// ── Delete a link ─────────────────────────────────────────────────────────────
app.delete<{ Params: { code: string } }>('/api/v1/links/:code', async (req, reply) => {
  const deleted = await redis.del(`link:${req.params.code}`);
  if (!deleted) return reply.code(404).send({ error: 'NOT_FOUND', message: 'Link not found' });
  reply.code(204);
});

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`link-router listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
