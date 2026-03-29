import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StdioConfig } from '../types';
import { logger } from '../../shared/logger';

export const createStdioTransport = (config: StdioConfig): StdioClientTransport => {
  logger.debug({ command: config.command, args: config.args }, 'Creating STDIO Transport');

  // Filter out undefined values from process.env to satisfy Record<string, string>
  const baseEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) baseEnv[k] = v;
  }

  return new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: { ...baseEnv, ...config.env },
  });
};
