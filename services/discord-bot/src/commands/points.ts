/**
 * Points/Economy Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your points and stats')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Check another user\'s points')
    ),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    // Get points
    const pointsKey = `user:${targetUser.id}:points`;
    const points = await redis.get(pointsKey) || '0';

    // Get stats
    const statsKey = `user:${targetUser.id}:stats`;
    const stats = await redis.hGetAll(statsKey);

    // Get rank
    const allUsers = await redis.keys('user:*:points');
    const userPoints = await Promise.all(
      allUsers.map(async key => ({
        id: key.split(':')[1],
        points: parseInt(await redis.get(key) || '0'),
      }))
    );
    userPoints.sort((a, b) => b.points - a.points);
    const rank = userPoints.findIndex(u => u.id === targetUser.id) + 1;

    // Calculate level (every 100 points = 1 level)
    const level = Math.floor(parseInt(points) / 100);
    const nextLevelPoints = (level + 1) * 100;
    const progressToNext = parseInt(points) - (level * 100);

    const embed = new EmbedBuilder()
      .setTitle(`${targetUser.username}'s Profile`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setColor('#00AAFF')
      .addFields(
        { name: '💰 Points', value: points, inline: true },
        { name: '📊 Level', value: level.toString(), inline: true },
        { name: '🏆 Rank', value: `#${rank}`, inline: true },
        { name: '📈 Progress', value: `${progressToNext}/${nextLevelPoints - (level * 100)} to Level ${level + 1}`, inline: false },
        { name: '🎮 Trivia Correct', value: stats.trivia_correct || '0', inline: true },
        { name: '❌ Trivia Wrong', value: stats.trivia_wrong || '0', inline: true },
        { name: '🎥 Clips Created', value: stats.clips_created || '0', inline: true }
      )
      .setFooter({ text: 'Earn points by chatting, playing games, and creating clips!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
