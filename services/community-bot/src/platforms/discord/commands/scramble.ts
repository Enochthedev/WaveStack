/**
 * Word Scramble Game
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

const words = [
  'programming', 'javascript', 'computer', 'keyboard', 'monitor',
  'streaming', 'discord', 'twitch', 'youtube', 'gaming',
  'developer', 'software', 'algorithm', 'database', 'network',
  'internet', 'application', 'website', 'server', 'client',
  'framework', 'library', 'function', 'variable', 'array',
  'object', 'string', 'number', 'boolean', 'interface',
];

function scrambleWord(word: string): string {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scramble')
    .setDescription('Unscramble the word for points!'),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const word = words[Math.floor(Math.random() * words.length)];
    let scrambled = scrambleWord(word);

    // Make sure it's actually scrambled
    while (scrambled === word && word.length > 3) {
      scrambled = scrambleWord(word);
    }

    const difficulty = word.length <= 6 ? 'easy' : word.length <= 9 ? 'medium' : 'hard';
    const points = word.length <= 6 ? 10 : word.length <= 9 ? 15 : 20;

    await interaction.reply({
      content: `🔤 **Word Scramble** (${difficulty})\n\nUnscramble this word:\n**${scrambled.toUpperCase()}**\n\nYou have 45 seconds to answer!`,
    });

    // Set up message collector
    const filter = (m: { author: { id: string }; content: string }) => {
      return m.author.id === interaction.user.id && m.content.length > 0;
    };

    const collector = interaction.channel?.createMessageCollector({
      filter,
      time: 45000,
      max: 1,
    });

    collector?.on('collect', async (message) => {
      const userAnswer = message.content.toLowerCase().trim();

      if (userAnswer === word) {
        const pointsKey = `points:${interaction.guildId}:${interaction.user.id}`;
        await redis.incrBy(pointsKey, points);

        await message.reply(`✅ Correct! The word is **${word}**\n+${points} points! 🎉`);
      } else {
        await message.reply(`❌ Wrong! The correct word is **${word}**`);
      }
    });

    collector?.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.followUp(`⏰ Time's up! The word was **${word}**`).catch(() => {});
      }
    });
  },
};
