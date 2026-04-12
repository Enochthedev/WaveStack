/**
 * Coinflip Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin')
    .addStringOption(option =>
      option.setName('call')
        .setDescription('Call it! Heads or Tails?')
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const call = interaction.options.getString('call');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const emoji = result === 'heads' ? '🪙' : '🥇';

    let message = `${emoji} **Coinflip**\n\n**Result:** ${result.charAt(0).toUpperCase() + result.slice(1)}`;

    if (call) {
      const won = call === result;
      message += `\n**You called:** ${call.charAt(0).toUpperCase() + call.slice(1)}`;
      message += `\n\n${won ? '✅ You win! 🎉' : '❌ You lose!'}`;

      // Award points for win
      if (won) {
        const pointsKey = `points:${interaction.guildId}:${interaction.user.id}`;
        await redis.incrBy(pointsKey, 10);
        message += '\n+10 points!';
      }
    }

    await interaction.reply({ content: message });
  },
};
