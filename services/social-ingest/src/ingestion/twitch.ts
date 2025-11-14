/**
 * Twitch IRC Data Ingestor
 */
import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import * as WebSocket from 'ws';

export class TwitchIngestor {
  private ws: WebSocket | null = null;
  private prisma: PrismaClient;
  private redis: RedisClientType;
  private logger: Logger;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(prisma: PrismaClient, redis: RedisClientType, logger: Logger) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;
  }

  async start() {
    this.connect();
  }

  async stop() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.logger.info('Twitch ingestor stopped');
  }

  private connect() {
    this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    this.ws.on('open', () => {
      this.logger.info('Connected to Twitch IRC');
      this.reconnectAttempts = 0;

      // Authenticate
      const username = process.env.TWITCH_USERNAME;
      const token = process.env.TWITCH_OAUTH_TOKEN;

      this.ws?.send(`PASS ${token}`);
      this.ws?.send(`NICK ${username}`);

      // Request capabilities
      this.ws?.send('CAP REQ :twitch.tv/membership');
      this.ws?.send('CAP REQ :twitch.tv/tags');
      this.ws?.send('CAP REQ :twitch.tv/commands');

      // Join channels
      const channels = (process.env.TWITCH_CHANNELS || '').split(',');
      channels.forEach(channel => {
        this.ws?.send(`JOIN #${channel.trim()}`);
        this.logger.info(`Joined Twitch channel: ${channel}`);
      });
    });

    this.ws.on('message', async (data: string) => {
      await this.handleMessage(data.toString());
    });

    this.ws.on('close', () => {
      this.logger.warn('Twitch IRC connection closed');
      this.attemptReconnect();
    });

    this.ws.on('error', (error) => {
      this.logger.error({ err: error }, 'Twitch IRC error');
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      this.logger.error('Max reconnect attempts reached');
    }
  }

  private async handleMessage(rawMessage: string) {
    // Handle PING/PONG
    if (rawMessage.startsWith('PING')) {
      this.ws?.send('PONG :tmi.twitch.tv');
      return;
    }

    // Parse IRC message
    const parsed = this.parseIRCMessage(rawMessage);
    if (!parsed) return;

    try {
      if (parsed.command === 'PRIVMSG') {
        await this.ingestChatMessage(parsed);
      } else if (parsed.command === 'USERNOTICE') {
        await this.ingestEvent(parsed);
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Error handling Twitch message');
    }
  }

  private parseIRCMessage(rawMessage: string) {
    const messageParts = rawMessage.split(' ');
    if (messageParts.length < 3) return null;

    const tags: Record<string, string> = {};
    let messageIndex = 0;

    // Parse tags
    if (messageParts[0].startsWith('@')) {
      const tagString = messageParts[0].substring(1);
      tagString.split(';').forEach(tag => {
        const [key, value] = tag.split('=');
        tags[key] = value || '';
      });
      messageIndex = 1;
    }

    // Parse prefix
    let prefix = '';
    if (messageParts[messageIndex].startsWith(':')) {
      prefix = messageParts[messageIndex].substring(1);
      messageIndex++;
    }

    // Parse command
    const command = messageParts[messageIndex];
    messageIndex++;

    // Parse params
    const params: string[] = [];
    while (messageIndex < messageParts.length) {
      if (messageParts[messageIndex].startsWith(':')) {
        params.push(messageParts.slice(messageIndex).join(' ').substring(1));
        break;
      }
      params.push(messageParts[messageIndex]);
      messageIndex++;
    }

    return { tags, prefix, command, params };
  }

  private async ingestChatMessage(parsed: any) {
    const channel = parsed.params[0]?.replace('#', '');
    const content = parsed.params[1] || '';

    const normalizedMessage = {
      platform: 'twitch',
      platformId: parsed.tags['id'] || `${Date.now()}-${Math.random()}`,
      channelId: parsed.tags['room-id'] || channel,
      channelName: channel,

      userId: parsed.tags['user-id'] || '',
      username: parsed.tags['display-name'] || parsed.tags['login'] || '',
      userDisplayName: parsed.tags['display-name'] || '',
      userAvatarUrl: null,

      content,
      contentType: 'text',

      attachments: [],
      mentions: this.extractMentions(content),
      hashtags: Array.from(content.matchAll(/#(\w+)/g)).map(m => m[1]),
      emotes: this.parseEmotes(parsed.tags['emotes'], content),

      isBot: parsed.tags['badges']?.includes('bot') || false,
      isPinned: false,

      metadata: {
        color: parsed.tags['color'],
        badges: parsed.tags['badges'],
        mod: parsed.tags['mod'] === '1',
        subscriber: parsed.tags['subscriber'] === '1',
        turbo: parsed.tags['turbo'] === '1',
      },

      createdAt: new Date(parseInt(parsed.tags['tmi-sent-ts']) || Date.now()),
    };

    await this.prisma.message.create({
      data: normalizedMessage,
    });

    // Update analytics
    await this.updateAnalytics(normalizedMessage);

    this.logger.debug({ channel, username: normalizedMessage.username }, 'Ingested Twitch message');
  }

  private async ingestEvent(parsed: any) {
    const eventType = parsed.tags['msg-id'];
    const channel = parsed.params[0]?.replace('#', '');

    const event = {
      platform: 'twitch',
      platformId: parsed.tags['id'],
      eventType,
      channelId: parsed.tags['room-id'],
      channelName: channel,
      userId: parsed.tags['user-id'],
      username: parsed.tags['display-name'],
      data: parsed.tags,
      createdAt: new Date(parseInt(parsed.tags['tmi-sent-ts']) || Date.now()),
    };

    await this.prisma.event.create({ data: event });

    this.logger.info({ eventType, channel }, 'Ingested Twitch event');
  }

  private extractMentions(content: string): string[] {
    return Array.from(content.matchAll(/@(\w+)/g)).map(m => m[1]);
  }

  private parseEmotes(emotesTag: string, content: string): any[] {
    if (!emotesTag) return [];

    const emotes: any[] = [];
    emotesTag.split('/').forEach(emote => {
      const [id, positions] = emote.split(':');
      positions.split(',').forEach(pos => {
        const [start, end] = pos.split('-').map(Number);
        emotes.push({
          id,
          name: content.substring(start, end + 1),
          positions: [start, end],
        });
      });
    });

    return emotes;
  }

  private async updateAnalytics(message: any) {
    await this.prisma.userAnalytics.upsert({
      where: {
        platform_userId: {
          platform: 'twitch',
          userId: message.userId,
        },
      },
      create: {
        platform: 'twitch',
        userId: message.userId,
        username: message.username,
        messageCount: 1,
        firstSeen: message.createdAt,
        lastSeen: message.createdAt,
      },
      update: {
        messageCount: { increment: 1 },
        lastSeen: message.createdAt,
      },
    });
  }
}
