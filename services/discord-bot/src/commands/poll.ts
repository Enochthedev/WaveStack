/**
 * Poll Creator Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('The poll question')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('options')
        .setDescription('Poll options separated by commas (max 10)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes (default: no limit)')
        .setMinValue(1)
        .setMaxValue(1440) // 24 hours
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const question = interaction.options.getString('question', true);
    const optionsString = interaction.options.getString('options', true);
    const duration = interaction.options.getInteger('duration');

    // Parse options
    const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (options.length < 2) {
      return interaction.reply({
        content: '❌ Please provide at least 2 options!',
        ephemeral: true,
      });
    }

    if (options.length > 10) {
      return interaction.reply({
        content: '❌ Maximum 10 options allowed!',
        ephemeral: true,
      });
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${question}`)
      .setDescription(options.map((opt, i) => `${numberEmojis[i]} ${opt}`).join('\n'))
      .setColor(0x5865F2)
      .setFooter({ text: `Poll by ${interaction.user.username}${duration ? ` • Ends in ${duration} min` : ''}` })
      .setTimestamp();

    const message = await interaction.reply({
      embeds: [embed],
      fetchReply: true,
    });

    // Add reactions
    for (let i = 0; i < options.length; i++) {
      await message.react(numberEmojis[i]);
    }

    // If duration is set, close poll after time
    if (duration) {
      setTimeout(async () => {
        try {
          const updatedMessage = await message.fetch();
          const reactions = updatedMessage.reactions.cache;

          // Count votes
          const results = await Promise.all(
            options.map(async (opt, i) => {
              const reaction = reactions.get(numberEmojis[i]);
              const count = reaction ? (await reaction.users.fetch()).size - 1 : 0; // -1 for bot
              return { option: opt, votes: count };
            })
          );

          // Sort by votes
          results.sort((a, b) => b.votes - a.votes);

          // Create results embed
          const resultsEmbed = new EmbedBuilder()
            .setTitle(`📊 ${question} - CLOSED`)
            .setDescription(results.map((r, i) => `${i === 0 ? '🏆' : numberEmojis[i]} **${r.option}** - ${r.votes} vote${r.votes !== 1 ? 's' : ''}`).join('\n'))
            .setColor(0xED4245)
            .setFooter({ text: `Poll by ${interaction.user.username} • Closed` })
            .setTimestamp();

          await interaction.editReply({ embeds: [resultsEmbed] });
        } catch (error) {
          logger.error('Failed to close poll:', error);
        }
      }, duration * 60 * 1000);
    }
  },
};
