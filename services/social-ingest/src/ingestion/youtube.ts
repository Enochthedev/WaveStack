/**
 * YouTube Live Chat Ingestor
 */
import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import axios from 'axios';

export class YouTubeIngestor {
  private prisma: PrismaClient;
  private redis: RedisClientType;
  private logger: Logger;
  private pollInterval: NodeJS.Timeout | null = null;
  private liveChatId: string | null = null;
  private pageToken: string | null = null;

  constructor(prisma: PrismaClient, redis: RedisClientType, logger: Logger) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
  }

  async start() {
    await this.findLiveStream();

    if (this.liveChatId) {
      this.startPolling();
      this.logger.info({ liveChatId: this.liveChatId }, 'YouTube ingestor started');
    } else {
      this.logger.info('No active YouTube live stream found');
      // Check every 5 minutes for new live streams
      setInterval(() => this.findLiveStream(), 5 * 60 * 1000);
    }
  }

  async stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.logger.info('YouTube ingestor stopped');
  }

  private async findLiveStream() {
    try {
      const channelIds = (process.env.YOUTUBE_CHANNEL_IDS || '').split(',');

      for (const channelId of channelIds) {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            channelId: channelId.trim(),
            eventType: 'live',
            type: 'video',
            key: process.env.YOUTUBE_API_KEY,
          },
        });

        if (response.data.items.length > 0) {
          const videoId = response.data.items[0].id.videoId;

          // Get live chat ID
          const videoResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
              part: 'liveStreamingDetails',
              id: videoId,
              key: process.env.YOUTUBE_API_KEY,
            },
          });

          this.liveChatId = videoResponse.data.items[0]?.liveStreamingDetails?.activeLiveChatId;

          if (this.liveChatId) {
            this.logger.info({ videoId, liveChatId: this.liveChatId }, 'Found active YouTube live stream');
            break;
          }
        }
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Error finding YouTube live stream');
    }
  }

  private startPolling() {
    this.pollInterval = setInterval(async () => {
      await this.pollMessages();
    }, 5000); // Poll every 5 seconds (YouTube rate limit)
  }

  private async pollMessages() {
    if (!this.liveChatId) return;

    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/liveChat/messages', {
        params: {
          liveChatId: this.liveChatId,
          part: 'snippet,authorDetails',
          pageToken: this.pageToken,
          key: process.env.YOUTUBE_API_KEY,
        },
      });

      this.pageToken = response.data.nextPageToken;

      for (const item of response.data.items) {
        await this.ingestMessage(item);
      }

    } catch (error: any) {
      if (error.response?.status === 403) {
        this.logger.warn('Live chat ended or quota exceeded');
        this.stop();
      } else {
        this.logger.error({ err: error }, 'Error polling YouTube messages');
      }
    }
  }

  private async ingestMessage(item: any) {
    try {
      const snippet = item.snippet;
      const author = item.authorDetails;

      const normalizedMessage = {
        platform: 'youtube',
        platformId: item.id,
        channelId: this.liveChatId!,
        channelName: 'Live Chat',

        userId: author.channelId,
        username: author.displayName,
        userDisplayName: author.displayName,
        userAvatarUrl: author.profileImageUrl,

        content: snippet.displayMessage,
        contentType: 'text',

        attachments: [],
        mentions: [],
        hashtags: Array.from(snippet.displayMessage.matchAll(/#(\w+)/g)).map((m: any) => m[1]),
        emotes: [],

        isBot: false,
        isPinned: false,

        metadata: {
          type: snippet.type,
          isChatOwner: author.isChatOwner,
          isChatModerator: author.isChatModerator,
          isChatSponsor: author.isChatSponsor,
        },

        createdAt: new Date(snippet.publishedAt),
      };

      await this.prisma.message.create({
        data: normalizedMessage,
      });

      this.logger.debug({ username: author.displayName }, 'Ingested YouTube message');

    } catch (error) {
      this.logger.error({ err: error }, 'Error ingesting YouTube message');
    }
  }
}
