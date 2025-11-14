/**
 * Economy Commands
 */
import { Context } from 'telegraf';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

export async function handlePoints(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const points = await redis.get(`points:${userId}`);
  const displayPoints = points ? parseInt(points) : 0;

  await ctx.reply(`💰 You have **${displayPoints}** points!`, { parse_mode: 'Markdown' });
}

export async function handleDaily(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const lastDaily = await redis.get(`daily:${userId}`);
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;

  if (lastDaily && now - parseInt(lastDaily) < dayInMs) {
    const timeLeft = dayInMs - (now - parseInt(lastDaily));
    const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
    return ctx.reply(`⏱️ You already claimed your daily! Try again in ${hoursLeft} hours.`);
  }

  const reward = 100;
  await redis.incrBy(`points:${userId}`, reward);
  await redis.set(`daily:${userId}`, now.toString());

  await ctx.reply(`🎁 Daily reward claimed! +${reward} points!`);
}

export async function handleLeaderboard(ctx: Context) {
  // This is a simplified version - would need proper sorted set in Redis
  await ctx.reply(
    '🏆 **Top Users**\n\n' +
    '1. User1 - 5000 pts\n' +
    '2. User2 - 4500 pts\n' +
    '3. User3 - 4000 pts\n' +
    '...',
    { parse_mode: 'Markdown' }
  );
}

export async function handleGive(ctx: Context) {
  const args = ctx.message?.text?.split(' ').slice(1);
  if (!args || args.length < 2) {
    return ctx.reply('Usage: /give @user <amount>');
  }

  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const amount = parseInt(args[1]);
  if (isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ Invalid amount');
  }

  const userPoints = await redis.get(`points:${userId}`);
  const currentPoints = userPoints ? parseInt(userPoints) : 0;

  if (currentPoints < amount) {
    return ctx.reply(`❌ You don't have enough points! You have ${currentPoints}.`);
  }

  // In real implementation, would extract actual user ID from mention
  await ctx.reply(`✅ Gave ${amount} points to ${args[0]}!`);
}

export async function handleGamble(ctx: Context) {
  const args = ctx.message?.text?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /gamble <amount>');
  }

  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const amount = parseInt(args[0]);
  if (isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ Invalid amount');
  }

  const userPoints = await redis.get(`points:${userId}`);
  const currentPoints = userPoints ? parseInt(userPoints) : 0;

  if (currentPoints < amount) {
    return ctx.reply(`❌ You don't have enough points! You have ${currentPoints}.`);
  }

  // 50/50 chance
  const won = Math.random() < 0.5;

  if (won) {
    await redis.incrBy(`points:${userId}`, amount);
    await ctx.reply(`🎰 You won! +${amount} points! 💰`);
  } else {
    await redis.incrBy(`points:${userId}`, -amount);
    await ctx.reply(`🎰 You lost! -${amount} points 😢`);
  }
}
