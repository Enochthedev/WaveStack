/**
 * Trivia Game Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

const triviaQuestions = [
  {
    question: 'What is the capital of France?',
    options: ['London', 'Berlin', 'Paris', 'Madrid'],
    correct: 2,
    category: 'Geography',
  },
  {
    question: 'Which programming language is known as the "language of the web"?',
    options: ['Python', 'JavaScript', 'Java', 'C++'],
    correct: 1,
    category: 'Technology',
  },
  {
    question: 'What year was the first iPhone released?',
    options: ['2005', '2007', '2009', '2011'],
    correct: 1,
    category: 'Technology',
  },
  {
    question: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correct: 1,
    category: 'Science',
  },
  {
    question: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correct: 3,
    category: 'Geography',
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Play a trivia game and earn points!')
    .addStringOption(option =>
      option.setName('category')
        .setDescription('Choose a category')
        .addChoices(
          { name: 'Random', value: 'random' },
          { name: 'Geography', value: 'geography' },
          { name: 'Technology', value: 'technology' },
          { name: 'Science', value: 'science' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const category = interaction.options.getString('category') || 'random';

    // Filter questions by category
    let filteredQuestions = triviaQuestions;
    if (category !== 'random') {
      filteredQuestions = triviaQuestions.filter(
        q => q.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (filteredQuestions.length === 0) {
      return interaction.reply({ content: 'No questions available for this category!', ephemeral: true });
    }

    // Select random question
    const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];

    // Create buttons for answers
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      question.options.map((option, index) =>
        new ButtonBuilder()
          .setCustomId(`trivia_${index}`)
          .setLabel(option)
          .setStyle(ButtonStyle.Primary)
      )
    );

    await interaction.reply({
      content: `🧠 **Trivia Time!**\n\n**Category:** ${question.category}\n**Question:** ${question.question}`,
      components: [row],
    });

    // Set up collector for button clicks
    const collector = interaction.channel?.createMessageComponentCollector({
      filter: (i) => i.customId.startsWith('trivia_') && i.user.id === interaction.user.id,
      time: 15000, // 15 seconds to answer
      max: 1,
    });

    collector?.on('collect', async (buttonInteraction) => {
      const selectedIndex = parseInt(buttonInteraction.customId.split('_')[1]);
      const isCorrect = selectedIndex === question.correct;

      if (isCorrect) {
        // Award points
        const pointsKey = `user:${interaction.user.id}:points`;
        await redis.incrBy(pointsKey, 10);
        const totalPoints = await redis.get(pointsKey);

        // Update trivia stats
        await redis.hincrBy(`user:${interaction.user.id}:stats`, 'trivia_correct', 1);

        await buttonInteraction.update({
          content: `✅ **Correct!** +10 points\n\n**Answer:** ${question.options[question.correct]}\n\n💰 Your total points: ${totalPoints}`,
          components: [],
        });
      } else {
        await redis.hincrBy(`user:${interaction.user.id}:stats`, 'trivia_wrong', 1);

        await buttonInteraction.update({
          content: `❌ **Wrong!**\n\n**Correct answer:** ${question.options[question.correct]}`,
          components: [],
        });
      }

      logger.info({
        userId: interaction.user.id,
        correct: isCorrect,
        question: question.question,
      }, 'Trivia answer submitted');
    });

    collector?.on('end', async (collected) => {
      if (collected.size === 0) {
        await interaction.editReply({
          content: `⏰ **Time's up!**\n\n**Correct answer:** ${question.options[question.correct]}`,
          components: [],
        });
      }
    });
  },
};
