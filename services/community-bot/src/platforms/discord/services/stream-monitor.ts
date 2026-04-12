/**
 * Stream Monitor Service
 * Monitors Twitch and YouTube for stream status and posts alerts
 */
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import axios from 'axios';
import * as cron from 'node-cron';

export class StreamMonitor {
  private client: Client;
  private redis: RedisClientType;
  private logger: Logger;
  private checkInterval: NodeJS.Timeout | null = null;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(client: Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async start() {
    // Check every minute
    this.cronJob = cron.schedule('* * * * *', async () => {
      await this.checkStreams();
    });

    this.logger.info('Stream monitor started');
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.logger.info('Stream monitor stopped');
  }

  private async checkStreams() {
    try {
      await this.checkTwitch();
      await this.checkYouTube();
    } catch (error) {
      this.logger.error({ err: error }, 'Error checking streams');
    }
  }

  private async checkTwitch() {
    const channelName = process.env.TWITCH_CHANNEL_NAME;
    if (!channelName) return;

    try {
      // Get Twitch OAuth token
      const authResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
        params: {
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          grant_type: 'client_credentials',
        },
      });

      const accessToken = authResponse.data.access_token;

      // Check if stream is live
      const streamResponse = await axios.get('https://api.twitch.tv/helix/streams', {
        params: { user_login: channelName },
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID!,
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const isLive = streamResponse.data.data.length > 0;
      const wasLive = await this.redis.get('twitch:is_live') === 'true';

      if (isLive && !wasLive) {
        // Stream just went live!
        const stream = streamResponse.data.data[0];

        // Store stream info
        await this.redis.set('twitch:is_live', 'true');
        await this.redis.set('current_stream_url', `https://twitch.tv/${channelName}`);
        await this.redis.set('stream_start_time', Date.now().toString());

        // Get user info for profile picture
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
          params: { login: channelName },
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID!,
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const user = userResponse.data.data[0];

        // Post stream alert
        await this.postStreamAlert({
          platform: 'Twitch',
          title: stream.title,
          game: stream.game_name,
          thumbnailUrl: stream.thumbnail_url.replace('{width}', '1280').replace('{height}', '720'),
          profileImageUrl: user.profile_image_url,
          viewerCount: stream.viewer_count,
          url: `https://twitch.tv/${channelName}`,
        });

        this.logger.info({ channelName, title: stream.title }, 'Twitch stream went live');

      } else if (!isLive && wasLive) {
        // Stream ended
        await this.redis.set('twitch:is_live', 'false');
        await this.redis.del('current_stream_url');
        await this.redis.del('stream_start_time');

        this.logger.info({ channelName }, 'Twitch stream ended');
      }

    } catch (error) {
      this.logger.error({ err: error }, 'Error checking Twitch');
    }
  }

  private async checkYouTube() {
    const channelId = process.env.YOUTUBE_CHANNEL_ID;
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!channelId || !apiKey) return;

    try {
      // Search for live streams
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          channelId,
          eventType: 'live',
          type: 'video',
          key: apiKey,
        },
      });

      const isLive = response.data.items.length > 0;
      const wasLive = await this.redis.get('youtube:is_live') === 'true';

      if (isLive && !wasLive) {
        const video = response.data.items[0];

        await this.redis.set('youtube:is_live', 'true');
        await this.redis.set('current_stream_url', `https://youtube.com/watch?v=${video.id.videoId}`);
        await this.redis.set('stream_start_time', Date.now().toString());

        await this.postStreamAlert({
          platform: 'YouTube',
          title: video.snippet.title,
          game: video.snippet.channelTitle,
          thumbnailUrl: video.snippet.thumbnails.high.url,
          profileImageUrl: video.snippet.thumbnails.default.url,
          viewerCount: 0,
          url: `https://youtube.com/watch?v=${video.id.videoId}`,
        });

        this.logger.info({ videoId: video.id.videoId }, 'YouTube stream went live');

      } else if (!isLive && wasLive) {
        await this.redis.set('youtube:is_live', 'false');
        await this.redis.del('current_stream_url');
        await this.redis.del('stream_start_time');

        this.logger.info('YouTube stream ended');
      }

    } catch (error) {
      this.logger.error({ err: error }, 'Error checking YouTube');
    }
  }

  private async postStreamAlert(streamInfo: {
    platform: string;
    title: string;
    game: string;
    thumbnailUrl: string;
    profileImageUrl: string;
    viewerCount: number;
    url: string;
  }) {
    const channelId = process.env.STREAM_ALERT_CHANNEL_ID;
    if (!channelId) return;

    try {
      const channel = await this.client.channels.fetch(channelId) as TextChannel;
      if (!channel || !channel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setTitle(`🔴 LIVE on ${streamInfo.platform}!`)
        .setDescription(`**${streamInfo.title}**`)
        .setColor('#9146FF')
        .setThumbnail(streamInfo.profileImageUrl)
        .setImage(streamInfo.thumbnailUrl)
        .addFields(
          { name: '🎮 Playing', value: streamInfo.game || 'Just Chatting', inline: true },
          { name: '👥 Viewers', value: streamInfo.viewerCount.toString(), inline: true }
        )
        .setURL(streamInfo.url)
        .setTimestamp();

      await channel.send({
        content: '@everyone 🔴 **STREAM IS LIVE!** 🔴',
        embeds: [embed],
      });

    } catch (error) {
      this.logger.error({ err: error }, 'Error posting stream alert');
    }
  }
}
