/**
 * Giveaway Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway!')
    .addStringOption(option =>
      option.setName('prize')
        .setDescription('What are you giving away?')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(1440)
    )
    .addIntegerOption(option =>
      option.setName('winners')
        .setDescription('Number of winners (default: 1)')
        .setMinValue(1)
        .setMaxValue(10)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const prize = interaction.options.getString('prize', true);
    const duration = interaction.options.getInteger('duration', true);
    const winners = interaction.options.getInteger('winners') || 1;

    const endTime = Date.now() + duration * 60 * 1000;

    const embed = new EmbedBuilder()
      .setTitle('🎉 GIVEAWAY 🎉')
      .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endTime / 1000)}:R>\n\nReact with 🎉 to enter!`)
      .setColor('#FF00FF')
      .setFooter({ text: `Hosted by ${interaction.user.username}` })
      .setTimestamp(endTime);

    await interaction.reply({ embeds: [embed] });
    const message = await interaction.fetchReply();
    await message.react('🎉');

    // Store giveaway data in Redis
    await redis.hSet(`giveaway:${message.id}`, {
      prize,
      winners: winners.toString(),
      endTime: endTime.toString(),
      hostId: interaction.user.id,
      channelId: interaction.channelId,
    });

    logger.info({
      giveawayId: message.id,
      prize,
      duration,
      winners,
    }, 'Giveaway created');

    // Schedule giveaway end
    setTimeout(async () => {
      try {
        const updatedMessage = await message.fetch();
        const reaction = updatedMessage.reactions.cache.get('🎉');

        if (!reaction) {
          await interaction.followUp('❌ No one entered the giveaway!');
          return;
        }

        const users = await reaction.users.fetch();
        const participants = users.filter(user => !user.bot);

        if (participants.size === 0) {
          await interaction.followUp('❌ No valid entries for the giveaway!');
          return;
        }

        // Select random winners
        const participantArray = Array.from(participants.values());
        const selectedWinners = [];

        for (let i = 0; i < Math.min(winners, participantArray.length); i++) {
          const randomIndex = Math.floor(Math.random() * participantArray.length);
          selectedWinners.push(participantArray.splice(randomIndex, 1)[0]);
        }

        const winnerMentions = selectedWinners.map(user => `<@${user.id}>`).join(', ');

        const resultEmbed = new EmbedBuilder()
          .setTitle('🎉 GIVEAWAY ENDED 🎉')
          .setDescription(`**Prize:** ${prize}\n**Winner(s):** ${winnerMentions}\n\nCongratulations!`)
          .setColor('#00FF00')
          .setFooter({ text: `Hosted by ${interaction.user.username}` })
          .setTimestamp();

        await interaction.followUp({ embeds: [resultEmbed] });
        await redis.del(`giveaway:${message.id}`);

        logger.info({
          giveawayId: message.id,
          winners: selectedWinners.map(u => u.id),
        }, 'Giveaway completed');

      } catch (error) {
        logger.error({ err: error }, 'Error ending giveaway');
      }
    }, duration * 60 * 1000);
  },
};
