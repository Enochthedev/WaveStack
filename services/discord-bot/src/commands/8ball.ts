/**
 * Magic 8-Ball Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

const responses = [
  // Positive responses
  'It is certain.',
  'It is decidedly so.',
  'Without a doubt.',
  'Yes definitely.',
  'You may rely on it.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Yes.',
  'Signs point to yes.',
  // Non-committal responses
  'Reply hazy, try again.',
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  // Negative responses
  'Don\'t count on it.',
  'My reply is no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a yes/no question')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Your yes/no question')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const question = interaction.options.getString('question', true);
    const response = responses[Math.floor(Math.random() * responses.length)];

    await interaction.reply({
      content: `🔮 **Magic 8-Ball**\n\n**Question:** ${question}\n**Answer:** *${response}*`,
    });
  },
};
