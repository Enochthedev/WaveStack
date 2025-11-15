/**
 * Dice Roll Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll dice')
    .addIntegerOption(option =>
      option.setName('dice')
        .setDescription('Number of dice to roll')
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addIntegerOption(option =>
      option.setName('sides')
        .setDescription('Number of sides per die')
        .setMinValue(2)
        .setMaxValue(100)
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const numDice = interaction.options.getInteger('dice') || 1;
    const numSides = interaction.options.getInteger('sides') || 6;

    const rolls: number[] = [];
    let total = 0;

    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * numSides) + 1;
      rolls.push(roll);
      total += roll;
    }

    const diceEmoji = numSides === 6 ? '🎲' : '🔢';
    const rollsText = rolls.length > 1 ? `\n**Rolls:** ${rolls.join(', ')}` : '';

    await interaction.reply({
      content: `${diceEmoji} **Dice Roll**\n\nRolled ${numDice}d${numSides}${rollsText}\n**Total:** ${total}`,
    });
  },
};
