import { redis } from '../shared/redis';
import { env } from '../config/env';
import crypto from 'crypto';

export class McpCache {
  private static generateKey(serverId: string, toolName: string, input: any): string {
    const hash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return `mcp:cache:${serverId}:${toolName}:${hash}`;
  }

  static async get(serverId: string, toolName: string, input: any): Promise<any | null> {
    const key = this.generateKey(serverId, toolName, input);
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  static async set(serverId: string, toolName: string, input: any, output: any): Promise<void> {
    const key = this.generateKey(serverId, toolName, input);
    await redis.setex(key, env.CACHE_TTL_SECONDS, JSON.stringify(output));
  }
}
