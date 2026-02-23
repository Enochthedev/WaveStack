import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { SseConfig } from '../types';
import { logger } from '../../shared/logger';

export const createSseTransport = (config: SseConfig): SSEClientTransport => {
  logger.debug({ url: config.url }, 'Creating SSE Transport');
  return new SSEClientTransport(new URL(config.url), {
    headers: config.env as Record<string, string>,
  });
};
