/**
 * Leaderboard Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server leaderboard')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Leaderboard type')
        .addChoices(
          { name: 'Points', value: 'points' },
          { name: 'Level', value: 'level' },
          { name: 'Clips', value: 'clips' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    await interaction.deferReply();

    const type = interaction.options.getString('type') || 'points';

    try {
      // Get all users with points
      const allUsers = await redis.keys('user:*:points');
      const userDataPromises = allUsers.map(async key => {
        const userId = key.split(':')[1];
        const points = parseInt(await redis.get(key) || '0');
        const stats = await redis.hGetAll(`user:${userId}:stats`);

        return {
          userId,
          points,
          level: Math.floor(points / 100),
          clips: parseInt(stats.clips_created || '0'),
        };
      });

      let userData = await Promise.all(userDataPromises);

      // Sort based on type
      if (type === 'points') {
        userData.sort((a, b) => b.points - a.points);
      } else if (type === 'level') {
        userData.sort((a, b) => b.level - a.level);
      } else if (type === 'clips') {
        userData.sort((a, b) => b.clips - a.clips);
      }

      // Take top 10
      userData = userData.slice(0, 10);

      // Format leaderboard
      const leaderboardText = await Promise.all(
        userData.map(async (data, index) => {
          try {
            const user = await interaction.client.users.fetch(data.userId);
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

            if (type === 'points') {
              return `${medal} **${user.username}** - ${data.points} points`;
            } else if (type === 'level') {
              return `${medal} **${user.username}** - Level ${data.level}`;
            } else {
              return `${medal} **${user.username}** - ${data.clips} clips`;
            }
          } catch {
            return null;
          }
        })
      );

      const filteredLeaderboard = leaderboardText.filter(entry => entry !== null);

      const embed = new EmbedBuilder()
        .setTitle(`🏆 ${type.charAt(0).toUpperCase() + type.slice(1)} Leaderboard`)
        .setDescription(filteredLeaderboard.join('\n') || 'No data yet!')
        .setColor('#FFD700')
        .setFooter({ text: 'Keep earning to climb the ranks!' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error({ err: error }, 'Error fetching leaderboard');
      await interaction.editReply('❌ Failed to fetch leaderboard');
    }
  },
};
