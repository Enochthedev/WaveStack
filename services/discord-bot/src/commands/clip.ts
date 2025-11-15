/**
 * Clip Command - Create video clips from streams
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import axios from 'axios';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clip')
    .setDescription('Create a clip from the current or recent stream')
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration of the clip in seconds (default: 30)')
        .setMinValue(5)
        .setMaxValue(60)
    )
    .addIntegerOption(option =>
      option.setName('offset')
        .setDescription('How many seconds ago to start the clip (default: 30)')
        .setMinValue(0)
        .setMaxValue(300)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title for the clip')
        .setMaxLength(120)
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    await interaction.deferReply();

    const duration = interaction.options.getInteger('duration') || 30;
    const offset = interaction.options.getInteger('offset') || 30;
    const title = interaction.options.getString('title') || `Clip from ${interaction.user.username}`;

    try {
      // Get auth token from WaveStack API
      const authResponse = await axios.post(
        `${process.env.WAVESTACK_API_URL}/api/auth/token`,
        {
          client_id: process.env.WAVESTACK_CLIENT_ID,
          client_secret: process.env.WAVESTACK_CLIENT_SECRET,
        }
      );

      const token = authResponse.data.access_token;

      // Get current stream URL from Redis (set by stream monitor)
      const streamUrl = await redis.get('current_stream_url');
      if (!streamUrl) {
        return interaction.editReply('❌ No active stream found. Make sure you\'re currently streaming!');
      }

      // Calculate start time (current stream time - offset)
      const streamStartTime = await redis.get('stream_start_time');
      const currentStreamTime = Date.now() - parseInt(streamStartTime || '0');
      const startSec = Math.max(0, (currentStreamTime / 1000) - offset);

      // Create clip via WaveStack clipper API
      const clipResponse = await axios.post(
        `${process.env.WAVESTACK_API_URL.replace('core-app:3000', 'clipper:8000')}/api/v1/clip`,
        {
          source: streamUrl,
          start_sec: startSec,
          duration_sec: duration,
          out_ext: 'mp4',
          name: title.replace(/[^a-zA-Z0-9-_]/g, '_'),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const jobId = clipResponse.data.job_id;

      // Poll for clip completion
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));

        const statusResponse = await axios.get(
          `${process.env.WAVESTACK_API_URL.replace('core-app:3000', 'clipper:8000')}/api/v1/status/${jobId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const status = statusResponse.data;

        if (status.state === 'finished' && status.result) {
          // Clip is ready!
          await interaction.editReply({
            content: `✅ **Clip created successfully!**\n\n📹 **${title}**\n⏱️ Duration: ${duration}s\n💾 Size: ${(status.result.size_bytes / 1024 / 1024).toFixed(2)} MB\n\n🔗 [Download Clip](${status.result.url})`,
          });

          // Post to clips channel if configured
          const clipChannelId = process.env.CLIP_CHANNEL_ID;
          if (clipChannelId) {
            const clipChannel = await interaction.client.channels.fetch(clipChannelId);
            if (clipChannel?.isTextBased()) {
              await clipChannel.send({
                content: `🎬 **New clip by ${interaction.user}**\n\n**${title}**\n${status.result.url}`,
              });
            }
          }

          logger.info({ jobId, userId: interaction.user.id }, 'Clip created successfully');
          return;
        } else if (status.state === 'failed') {
          throw new Error(status.error || 'Clip creation failed');
        }

        attempts++;
      }

      throw new Error('Clip creation timed out');

    } catch (error: any) {
      logger.error({ err: error, userId: interaction.user.id }, 'Error creating clip');
      await interaction.editReply(`❌ Failed to create clip: ${error.message}`);
    }
  },
};
