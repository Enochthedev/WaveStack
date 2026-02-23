import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StdioConfig } from '../types';
import { logger } from '../../shared/logger';

export const createStdioTransport = (config: StdioConfig): StdioClientTransport => {
  logger.debug({ command: config.command, args: config.args }, 'Creating STDIO Transport');
  return new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: { ...process.env, ...config.env },
  });
};
