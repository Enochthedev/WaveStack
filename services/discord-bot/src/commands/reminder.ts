/**
 * Reminder Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Set a reminder')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('What to remind you about')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('time')
        .setDescription('Time in minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440) // 24 hours
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const message = interaction.options.getString('message', true);
    const time = interaction.options.getInteger('time', true);

    await interaction.reply({
      content: `⏰ Reminder set! I'll remind you about "${message}" in ${time} minute${time !== 1 ? 's' : ''}.`,
      ephemeral: true,
    });

    // Set reminder
    setTimeout(async () => {
      try {
        await interaction.user.send({
          content: `⏰ **Reminder!**\n\n${message}`,
        }).catch(async () => {
          // If DM fails, send in channel
          await interaction.followUp({
            content: `⏰ **Reminder for ${interaction.user}**\n\n${message}`,
          });
        });
      } catch (error) {
        logger.error('Failed to send reminder:', error);
      }
    }, time * 60 * 1000);
  },
};
