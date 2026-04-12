/**
 * Rock Paper Scissors Game
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

const choices = ['rock', 'paper', 'scissors'];
const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors against the bot!'),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    // Create buttons for choices
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('rps_rock')
        .setLabel('Rock 🪨')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rps_paper')
        .setLabel('Paper 📄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('rps_scissors')
        .setLabel('Scissors ✂️')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({
      content: '🎮 **Rock Paper Scissors!**\nChoose your move:',
      components: [row],
    });

    // Set up collector
    const collector = interaction.channel?.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith('rps_') && i.user.id === interaction.user.id,
      time: 30000,
      max: 1,
    });

    collector?.on('collect', async (buttonInteraction) => {
      const userChoice = buttonInteraction.customId.split('_')[1];
      const botChoice = choices[Math.floor(Math.random() * choices.length)];

      // Determine winner
      let result: string;
      let points = 0;

      if (userChoice === botChoice) {
        result = "It's a tie! 🤝";
        points = 5;
      } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
      ) {
        result = 'You win! 🎉';
        points = 15;
      } else {
        result = 'You lose! 😢';
        points = 0;
      }

      // Award points
      if (points > 0) {
        const pointsKey = `points:${interaction.guildId}:${interaction.user.id}`;
        await redis.incrBy(pointsKey, points);
      }

      await buttonInteraction.update({
        content: `🎮 **Rock Paper Scissors**\n\nYou chose: ${emojis[userChoice as keyof typeof emojis]} **${userChoice}**\nI chose: ${emojis[botChoice as keyof typeof emojis]} **${botChoice}**\n\n${result}${points > 0 ? `\n+${points} points!` : ''}`,
        components: [],
      });
    });

    collector?.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.editReply({
          content: '⏰ Time\'s up! Game ended.',
          components: [],
        }).catch(() => {});
      }
    });
  },
};
