/**
 * Daily Reward Command
 */
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily reward!'),

  async execute(interaction: ChatInputCommandInteraction, redis: RedisClientType, logger: Logger) {
    const userId = interaction.user.id;
    const dailyKey = `user:${userId}:daily`;
    const lastClaim = await redis.get(dailyKey);

    if (lastClaim) {
      const lastClaimTime = parseInt(lastClaim);
      const now = Date.now();
      const timeSinceClaim = now - lastClaimTime;
      const oneDay = 24 * 60 * 60 * 1000;

      if (timeSinceClaim < oneDay) {
        const timeLeft = oneDay - timeSinceClaim;
        const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

        return interaction.reply({
          content: `⏰ You've already claimed your daily reward! Come back in ${hoursLeft}h ${minutesLeft}m`,
          ephemeral: true,
        });
      }
    }

    // Award daily points
    const dailyReward = parseInt(process.env.DAILY_REWARD || '100');
    const pointsKey = `user:${userId}:points`;
    await redis.incrBy(pointsKey, dailyReward);
    await redis.set(dailyKey, Date.now().toString());

    const totalPoints = await redis.get(pointsKey);

    // Check streak
    const streakKey = `user:${userId}:streak`;
    let streak = parseInt(await redis.get(streakKey) || '0');
    streak += 1;
    await redis.set(streakKey, streak.toString());

    // Bonus for streaks
    let bonusMessage = '';
    if (streak >= 7) {
      const streakBonus = Math.floor(streak / 7) * 50;
      await redis.incrBy(pointsKey, streakBonus);
      bonusMessage = `\n🔥 **${streak}-day streak bonus!** +${streakBonus} points`;
    }

    await interaction.reply({
      content: `✅ **Daily reward claimed!**\n\n💰 +${dailyReward} points${bonusMessage}\n📊 Total points: ${totalPoints}\n🔥 Current streak: ${streak} days`,
    });

    logger.info({ userId, dailyReward, streak }, 'Daily reward claimed');
  },
};
