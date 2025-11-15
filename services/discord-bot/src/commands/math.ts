/**
 * Math Challenge Game
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('math')
    .setDescription('Solve a math problem for points!')
    .addStringOption(option =>
      option.setName('difficulty')
        .setDescription('Choose difficulty level')
        .addChoices(
          { name: 'Easy', value: 'easy' },
          { name: 'Medium', value: 'medium' },
          { name: 'Hard', value: 'hard' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const difficulty = interaction.options.getString('difficulty') || 'easy';

    // Generate math problem based on difficulty
    let num1: number, num2: number, operator: string, answer: number, points: number;

    if (difficulty === 'easy') {
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      operator = Math.random() < 0.5 ? '+' : '-';
      answer = operator === '+' ? num1 + num2 : num1 - num2;
      points = 10;
    } else if (difficulty === 'medium') {
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 12) + 1;
      operator = Math.random() < 0.5 ? '*' : '/';
      if (operator === '/') {
        num1 = num2 * (Math.floor(Math.random() * 10) + 1); // Ensure clean division
        answer = num1 / num2;
      } else {
        answer = num1 * num2;
      }
      points = 20;
    } else { // hard
      const operations = ['+', '-', '*'];
      const op1 = operations[Math.floor(Math.random() * operations.length)];
      const op2 = operations[Math.floor(Math.random() * operations.length)];
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      const num3 = Math.floor(Math.random() * 20) + 1;

      // Calculate answer step by step (PEMDAS)
      let tempAnswer: number;
      if (op1 === '*') {
        tempAnswer = num1 * num2;
        answer = op2 === '+' ? tempAnswer + num3 : op2 === '-' ? tempAnswer - num3 : tempAnswer * num3;
      } else {
        if (op2 === '*') {
          const product = num2 * num3;
          answer = op1 === '+' ? num1 + product : num1 - product;
        } else {
          tempAnswer = op1 === '+' ? num1 + num2 : num1 - num2;
          answer = op2 === '+' ? tempAnswer + num3 : tempAnswer - num3;
        }
      }

      await interaction.reply({
        content: `🧮 **Math Challenge** (${difficulty.toUpperCase()})\n\nSolve: ${num1} ${op1} ${num2} ${op2} ${num3} = ?\n\nYou have 30 seconds to answer!`,
      });

      // Set up message collector
      const filter = (m: { author: { id: string }; content: string }) => {
        return m.author.id === interaction.user.id && !isNaN(parseInt(m.content));
      };

      const collector = interaction.channel?.createMessageCollector({
        filter,
        time: 30000,
        max: 1,
      });

      collector?.on('collect', async (message) => {
        const userAnswer = parseInt(message.content);

        if (userAnswer === answer) {
          const pointsKey = `points:${interaction.guildId}:${interaction.user.id}`;
          await redis.incrBy(pointsKey, 30);

          await message.reply(`✅ Correct! The answer is **${answer}**\n+30 points! 🎉`);
        } else {
          await message.reply(`❌ Wrong! The correct answer is **${answer}**`);
        }
      });

      collector?.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.followUp(`⏰ Time's up! The answer was **${answer}**`).catch(() => {});
        }
      });

      return;
    }

    // For easy and medium
    await interaction.reply({
      content: `🧮 **Math Challenge** (${difficulty.toUpperCase()})\n\nSolve: ${num1} ${operator} ${num2} = ?\n\nYou have 30 seconds to answer!`,
    });

    // Set up message collector
    const filter = (m: { author: { id: string }; content: string }) => {
      return m.author.id === interaction.user.id && !isNaN(parseInt(m.content));
    };

    const collector = interaction.channel?.createMessageCollector({
      filter,
      time: 30000,
      max: 1,
    });

    collector?.on('collect', async (message) => {
      const userAnswer = parseInt(message.content);

      if (userAnswer === answer) {
        const pointsKey = `points:${interaction.guildId}:${interaction.user.id}`;
        await redis.incrBy(pointsKey, points);

        await message.reply(`✅ Correct! The answer is **${answer}**\n+${points} points! 🎉`);
      } else {
        await message.reply(`❌ Wrong! The correct answer is **${answer}**`);
      }
    });

    collector?.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.followUp(`⏰ Time's up! The answer was **${answer}**`).catch(() => {});
      }
    });
  },
};
