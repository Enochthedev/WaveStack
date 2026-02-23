import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { HttpConfig } from '../types';
import { logger } from '../../shared/logger';

// Note: The official MCP SDK typically uses SSE for HTTP transports under the hood. 
// If a specific HTTP REST transport is needed, it would be implemented here. For now, we wrap SSE.
export const createHttpTransport = (config: HttpConfig): SSEClientTransport => {
  logger.debug({ url: config.url }, 'Creating HTTP (SSE wrapper) Transport');
  return new SSEClientTransport(new URL(config.url), {
    headers: config.headers as Record<string, string>,
  });
};
