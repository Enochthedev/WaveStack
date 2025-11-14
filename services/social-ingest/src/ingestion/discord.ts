/**
 * Discord Data Ingestor
 */
import { Client, GatewayIntentBits, Message, Events } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class DiscordIngestor {
  private client: Client;
  private prisma: PrismaClient;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(prisma: PrismaClient, redis: RedisClientType, logger: Logger) {
    this.prisma = prisma;
    this.redis = redis;
    this.logger = logger;

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on(Events.MessageCreate, async (message: Message) => {
      await this.ingestMessage(message);
    });

    this.client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
      if (newMessage.partial) await newMessage.fetch();
      await this.updateMessage(newMessage as Message);
    });

    this.client.on(Events.MessageDelete, async (message) => {
      if (message.partial) await message.fetch();
      await this.markDeleted(message as Message);
    });

    this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
      await this.updateReactions(reaction.message.id, reaction.emoji.name || '');
    });
  }

  async start() {
    await this.client.login(process.env.DISCORD_BOT_TOKEN);
    this.logger.info('Discord ingestor connected');
  }

  async stop() {
    this.client.destroy();
    this.logger.info('Discord ingestor stopped');
  }

  private async ingestMessage(message: Message) {
    if (message.author.bot) return;

    try {
      const normalizedMessage = {
        platform: 'discord',
        platformId: message.id,
        channelId: message.channelId,
        channelName: message.channel.isDMBased() ? 'DM' : (message.channel as any).name,

        userId: message.author.id,
        username: message.author.username,
        userDisplayName: message.author.displayName,
        userAvatarUrl: message.author.displayAvatarURL(),

        content: message.content,
        contentType: message.attachments.size > 0 ? 'media' : 'text',

        attachments: message.attachments.map(att => ({
          url: att.url,
          type: att.contentType,
          name: att.name,
        })),

        mentions: message.mentions.users.map(u => u.id),
        hashtags: Array.from(message.content.matchAll(/#(\w+)/g)).map(m => m[1]),
        emotes: [], // Discord doesn't expose custom emotes in content

        isBot: message.author.bot,
        isPinned: message.pinned,

        createdAt: message.createdAt,
      };

      await this.prisma.message.create({
        data: normalizedMessage,
      });

      // Update analytics
      await this.updateAnalytics(message);

      this.logger.debug({ messageId: message.id }, 'Ingested Discord message');

    } catch (error) {
      this.logger.error({ err: error, messageId: message.id }, 'Error ingesting Discord message');
    }
  }

  private async updateMessage(message: Message) {
    try {
      await this.prisma.message.update({
        where: {
          platform_platformId: {
            platform: 'discord',
            platformId: message.id,
          },
        },
        data: {
          content: message.content,
          isEdited: true,
          editedAt: message.editedAt,
        },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Error updating message');
    }
  }

  private async markDeleted(message: Message) {
    try {
      await this.prisma.message.update({
        where: {
          platform_platformId: {
            platform: 'discord',
            platformId: message.id,
          },
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Error marking message as deleted');
    }
  }

  private async updateReactions(messageId: string, emoji: string) {
    // Update reaction counts in database
    try {
      const message = await this.prisma.message.findUnique({
        where: {
          platform_platformId: {
            platform: 'discord',
            platformId: messageId,
          },
        },
      });

      if (message) {
        const reactions = message.reactions as Record<string, number>;
        reactions[emoji] = (reactions[emoji] || 0) + 1;

        await this.prisma.message.update({
          where: { id: message.id },
          data: { reactions },
        });
      }
    } catch (error) {
      this.logger.error({ err: error }, 'Error updating reactions');
    }
  }

  private async updateAnalytics(message: Message) {
    // Update user analytics
    await this.prisma.userAnalytics.upsert({
      where: {
        platform_userId: {
          platform: 'discord',
          userId: message.author.id,
        },
      },
      create: {
        platform: 'discord',
        userId: message.author.id,
        username: message.author.username,
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
