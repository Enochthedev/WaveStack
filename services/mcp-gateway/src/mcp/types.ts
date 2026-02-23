import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export const stdioConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

export const sseConfigSchema = z.object({
  url: z.string().url(),
  env: z.record(z.string()).optional(),
});

// Currently identical to SSE or custom
export const httpConfigSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});

export type StdioConfig = z.infer<typeof stdioConfigSchema>;
export type SseConfig = z.infer<typeof sseConfigSchema>;
export type HttpConfig = z.infer<typeof httpConfigSchema>;

export interface ActiveConnection {
  serverId: string;
  client: Client;
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  lastPingAt: Date;
}
