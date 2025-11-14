/**
 * Clip Service
 * Monitors for new clips and posts them to Discord
 */
import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import * as cron from 'node-cron';
import axios from 'axios';

export class ClipService {
  private client: Client;
  private redis: RedisClientType;
  private logger: Logger;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(client: Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async postClipNotification(clipData: {
    title: string;
    url: string;
    thumbnailUrl?: string;
    creator: string;
    duration: number;
  }) {
    const channelId = process.env.CLIP_CHANNEL_ID;
    if (!channelId) return;

    try {
      const channel = await this.client.channels.fetch(channelId) as TextChannel;
      if (!channel || !channel.isTextBased()) return;

      const embed = new EmbedBuilder()
        .setTitle(`🎬 ${clipData.title}`)
        .setDescription(`Created by ${clipData.creator}`)
        .setColor('#FF6B6B')
        .addFields(
          { name: '⏱️ Duration', value: `${clipData.duration}s`, inline: true },
          { name: '🔗 Watch', value: `[Click here](${clipData.url})`, inline: true }
        )
        .setTimestamp();

      if (clipData.thumbnailUrl) {
        embed.setImage(clipData.thumbnailUrl);
      }

      await channel.send({ embeds: [embed] });

      this.logger.info({ clipData }, 'Posted clip notification');

    } catch (error) {
      this.logger.error({ err: error }, 'Error posting clip notification');
    }
  }
}
