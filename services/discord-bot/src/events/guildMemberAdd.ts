/**
 * Guild Member Add Event
 * Welcome new members
 */
import { Events, GuildMember, EmbedBuilder } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember, redis: RedisClientType, logger: Logger) {
    logger.info({
      userId: member.id,
      username: member.user.username,
    }, 'New member joined');

    // Initialize user points
    const pointsKey = `user:${member.id}:points`;
    await redis.set(pointsKey, '0');

    // Send welcome message
    const welcomeChannelId = process.env.WELCOME_CHANNEL_ID;
    if (welcomeChannelId) {
      try {
        const channel = await member.guild.channels.fetch(welcomeChannelId);
        if (channel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle('👋 Welcome to the server!')
            .setDescription(
              `Hey ${member}! Welcome to **${member.guild.name}**!\n\n` +
              `🎮 Use \`/help\` to see all available commands\n` +
              `💰 Use \`/daily\` to claim your daily reward\n` +
              `🎬 Use \`/clip\` to create clips from streams\n\n` +
              `Have fun and enjoy your stay!`
            )
            .setColor('#00FF00')
            .setThumbnail(member.user.displayAvatarURL())
            .setFooter({ text: `Member #${member.guild.memberCount}` })
            .setTimestamp();

          await channel.send({ embeds: [embed] });
        }
      } catch (error) {
        logger.error({ err: error }, 'Error sending welcome message');
      }
    }

    // Auto-assign role if configured
    const autoRoleId = process.env.AUTO_ROLE_ID;
    if (autoRoleId) {
      try {
        const role = await member.guild.roles.fetch(autoRoleId);
        if (role) {
          await member.roles.add(role);
          logger.info({ userId: member.id, roleId: autoRoleId }, 'Auto-assigned role');
        }
      } catch (error) {
        logger.error({ err: error }, 'Error auto-assigning role');
      }
    }
  },
};
