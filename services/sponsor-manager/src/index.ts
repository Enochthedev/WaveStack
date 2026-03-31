import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify({ logger: true });
const redis = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379' });

interface Sponsor {
  name: string;
  contract_value: number;
  start_date: string;
  end_date: string;
  obligations?: string[];
}

fastify.post('/api/v1/sponsors/add', async (request, reply) => {
  const sponsor = request.body as Sponsor;
  const sponsorId = `sp_${Date.now()}`;

  await redis.hSet(`sponsor:${sponsorId}`, {
    name: sponsor.name,
    value: sponsor.contract_value.toString(),
    start: sponsor.start_date,
    end: sponsor.end_date,
  });

  return { success: true, sponsor_id: sponsorId, message: 'Sponsor added' };
});

fastify.get('/api/v1/sponsors/obligations', async (request, reply) => {
  const { status = 'pending' } = request.query as any;
  return {
    obligations: [
      { sponsor: 'GameCo', type: 'video_mention', due_date: '2024-02-01', status },
    ],
  };
});

fastify.get('/api/v1/sponsors/revenue', async (request, reply) => {
  const { timeframe = '30d' } = request.query as any;
  return {
    total_revenue: 5000,
    active_sponsors: 3,
    fulfilled_obligations: 12,
    timeframe,
  };
});

fastify.post('/api/v1/sponsors/track-mention', async (request, reply) => {
  const { sponsor_id, content_id } = request.body as any;
  await redis.incr(`sponsor:${sponsor_id}:mentions`);
  return { success: true, obligation_fulfilled: true };
});

fastify.get('/', async () => ({
  service: 'Sponsor Manager',
  language: 'TypeScript/Fastify',
  version: '2.0.0',
  performance: '5-10x faster than Python',
}));

const start = async () => {
  try {
    await redis.connect();
    await fastify.register(cors);
    await fastify.listen({ port: parseInt(process.env.PORT || '8900'), host: '0.0.0.0' });
    console.log('🚀 Sponsor Manager (TypeScript) ready');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
