import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const db = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'warn' },
  ],
});

db.$on('query', (e) => {
  logger.trace({ query: e.query, params: e.params, duration: e.duration }, 'Prisma Query');
});
