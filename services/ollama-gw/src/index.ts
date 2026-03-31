import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Redis from 'ioredis';

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' } });
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

const PORT = parseInt(process.env.PORT || '4200');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '300');
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '2048');
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'llama3.2';

await app.register(cors, { origin: true });
await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });

// ── Helpers ───────────────────────────────────────────────────────────────────

async function ollamaFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${OLLAMA_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`Ollama ${path} → ${res.status}`), { status: res.status, body: text });
  }
  return res;
}

function cacheKey(model: string, prompt: string) {
  // Simple deterministic key — good enough for identical prompts
  return `ollama:cache:${model}:${Buffer.from(prompt).toString('base64').slice(0, 64)}`;
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', async () => {
  let ollamaOk = false;
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    ollamaOk = r.ok;
  } catch {}
  return { status: 'ok', service: 'ollama-gw', ollamaReachable: ollamaOk };
});

// ── List available models ─────────────────────────────────────────────────────
app.get('/api/v1/models', async (req, reply) => {
  try {
    const res = await ollamaFetch('/api/tags');
    const data = await res.json() as { models: unknown[] };
    return { models: data.models ?? [] };
  } catch (err: any) {
    return reply.code(502).send({ error: 'OLLAMA_UNAVAILABLE', message: err.message });
  }
});

// ── Pull a model ──────────────────────────────────────────────────────────────
app.post<{ Body: { model: string } }>('/api/v1/models/pull', async (req, reply) => {
  const { model } = req.body;
  if (!model) return reply.code(400).send({ error: 'MISSING_MODEL' });

  try {
    // Stream the pull progress back to the caller
    const res = await ollamaFetch('/api/pull', {
      method: 'POST',
      body: JSON.stringify({ model, stream: false }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return reply.code(502).send({ error: 'OLLAMA_UNAVAILABLE', message: err.message });
  }
});

// ── Delete a model ────────────────────────────────────────────────────────────
app.delete<{ Params: { model: string } }>('/api/v1/models/:model', async (req, reply) => {
  try {
    await ollamaFetch('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify({ model: req.params.model }),
    });
    reply.code(204);
  } catch (err: any) {
    return reply.code(502).send({ error: 'OLLAMA_UNAVAILABLE', message: err.message });
  }
});

// ── Generate (non-streaming) ──────────────────────────────────────────────────
app.post<{
  Body: {
    model?: string;
    prompt: string;
    system?: string;
    temperature?: number;
    max_tokens?: number;
    cache?: boolean;
  };
}>('/api/v1/generate', async (req, reply) => {
  const { prompt, system, temperature, max_tokens, cache = true } = req.body;
  const model = req.body.model ?? DEFAULT_MODEL;

  if (!prompt) return reply.code(400).send({ error: 'MISSING_PROMPT' });

  // Cache lookup
  if (cache) {
    const hit = await redis.get(cacheKey(model, prompt));
    if (hit) {
      return reply.header('X-Cache', 'HIT').send(JSON.parse(hit));
    }
  }

  try {
    const res = await ollamaFetch('/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model,
        prompt,
        system,
        stream: false,
        options: {
          temperature: temperature ?? 0.7,
          num_predict: Math.min(max_tokens ?? MAX_TOKENS, MAX_TOKENS),
        },
      }),
    });

    const data = await res.json() as Record<string, unknown>;
    const result = { model, response: data.response, eval_count: data.eval_count, cached: false };

    if (cache && CACHE_TTL > 0) {
      redis.setex(cacheKey(model, prompt), CACHE_TTL, JSON.stringify(result)).catch(() => {});
    }

    return reply.header('X-Cache', 'MISS').send(result);
  } catch (err: any) {
    return reply.code(502).send({ error: 'OLLAMA_UNAVAILABLE', message: err.message });
  }
});

// ── Chat (non-streaming) ──────────────────────────────────────────────────────
app.post<{
  Body: {
    model?: string;
    messages: { role: string; content: string }[];
    temperature?: number;
    max_tokens?: number;
  };
}>('/api/v1/chat', async (req, reply) => {
  const { messages, temperature, max_tokens } = req.body;
  const model = req.body.model ?? DEFAULT_MODEL;

  if (!messages?.length) return reply.code(400).send({ error: 'MISSING_MESSAGES' });

  try {
    const res = await ollamaFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: temperature ?? 0.7,
          num_predict: Math.min(max_tokens ?? MAX_TOKENS, MAX_TOKENS),
        },
      }),
    });

    const data = await res.json() as Record<string, unknown>;
    const msg = (data.message as { role: string; content: string }) ?? {};
    return { model, message: msg, eval_count: data.eval_count };
  } catch (err: any) {
    return reply.code(502).send({ error: 'OLLAMA_UNAVAILABLE', message: err.message });
  }
});

// ── Embeddings ────────────────────────────────────────────────────────────────
app.post<{ Body: { model?: string; input: string | string[] } }>(
  '/api/v1/embeddings',
  async (req, reply) => {
    const { input } = req.body;
    const model = req.body.model ?? 'nomic-embed-text';

    if (!input) return reply.code(400).send({ error: 'MISSING_INPUT' });

    const texts = Array.isArray(input) ? input : [input];

    try {
      const embeddings = await Promise.all(
        texts.map(async (text) => {
          const res = await ollamaFetch('/api/embeddings', {
            method: 'POST',
            body: JSON.stringify({ model, prompt: text }),
          });
          const data = await res.json() as { embedding: number[] };
          return data.embedding;
        }),
      );
      return { model, embeddings };
    } catch (err: any) {
      return reply.code(502).send({ error: 'OLLAMA_UNAVAILABLE', message: err.message });
    }
  },
);

// ── Cache stats ───────────────────────────────────────────────────────────────
app.get('/api/v1/cache/stats', async () => {
  const keys = await redis.keys('ollama:cache:*');
  return { cachedEntries: keys.length, ttlSeconds: CACHE_TTL };
});

app.delete('/api/v1/cache', async (req, reply) => {
  const keys = await redis.keys('ollama:cache:*');
  if (keys.length) await redis.del(...keys);
  reply.code(204);
});

try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`ollama-gw listening on port ${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
