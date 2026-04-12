/**
 * Clip Service - Interfaces with WaveStack clipper API
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import axios from 'axios';

export class ClipService {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async createAutoClip(channel: string) {
    try {
      // Get auth token
      const authResponse = await axios.post(
        `${process.env.WAVESTACK_API_URL}/api/auth/token`,
        {
          client_id: process.env.WAVESTACK_CLIENT_ID,
          client_secret: process.env.WAVESTACK_CLIENT_SECRET,
        }
      );

      const token = authResponse.data.access_token;

      // Get stream info
      const streamUrl = await this.redis.get('current_stream_url');
      const streamStartTime = await this.redis.get('stream_start_time');

      if (!streamUrl || !streamStartTime) {
        throw new Error('No active stream');
      }

      const currentStreamTime = Date.now() - parseInt(streamStartTime);
      const startSec = Math.max(0, (currentStreamTime / 1000) - 30); // 30 seconds ago

      // Create clip
      const clipResponse = await axios.post(
        `${process.env.WAVESTACK_API_URL.replace('core-app:3000', 'clipper:8000')}/api/v1/clip`,
        {
          source: streamUrl,
          start_sec: startSec,
          duration_sec: 30,
          out_ext: 'mp4',
          name: `autoclip_${Date.now()}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      this.logger.info({ jobId: clipResponse.data.job_id }, 'Auto-clip created');

      return clipResponse.data.job_id;

    } catch (error) {
      this.logger.error({ err: error }, 'Error creating auto-clip');
      throw error;
    }
  }
}
