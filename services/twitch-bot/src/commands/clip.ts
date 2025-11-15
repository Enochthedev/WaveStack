/**
 * Clip Command - Create clips from Twitch stream
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import axios from 'axios';

export class ClipCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    const duration = parseInt(args[0]) || 30;
    const offset = parseInt(args[1]) || 30;

    try {
      // Get WaveStack auth token
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
        return this.client.say(channel, `@${userstate.username}, no active stream found!`);
      }

      const currentStreamTime = Date.now() - parseInt(streamStartTime);
      const startSec = Math.max(0, (currentStreamTime / 1000) - offset);

      // Create clip
      await this.client.say(channel, `@${userstate.username}, creating your ${duration}s clip... ⏱️`);

      const clipResponse = await axios.post(
        `${process.env.WAVESTACK_API_URL.replace('core-app:3000', 'clipper:8000')}/api/v1/clip`,
        {
          source: streamUrl,
          start_sec: startSec,
          duration_sec: duration,
          out_ext: 'mp4',
          name: `twitch_clip_${userstate.username}_${Date.now()}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const jobId = clipResponse.data.job_id;

      // Poll for completion (simplified - in production, use webhooks)
      setTimeout(async () => {
        try {
          const statusResponse = await axios.get(
            `${process.env.WAVESTACK_API_URL.replace('core-app:3000', 'clipper:8000')}/api/v1/status/${jobId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (statusResponse.data.state === 'finished') {
            await this.client.say(channel, `@${userstate.username}, clip ready! 🎬 ${statusResponse.data.result.url}`);

            // Award points
            await this.redis.incrBy(`twitch:user:${userstate.username}:points`, 5);
          } else {
            await this.client.say(channel, `@${userstate.username}, clip is still processing... Check back in a moment!`);
          }
        } catch (error) {
          this.logger.error({ err: error }, 'Error checking clip status');
        }
      }, 30000); // Check after 30 seconds

    } catch (error) {
      this.logger.error({ err: error }, 'Error creating clip');
      await this.client.say(channel, `@${userstate.username}, failed to create clip!`);
    }
  }
}
