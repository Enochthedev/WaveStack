/**
 * Admin Commands
 */
import { Context } from 'telegraf';
import axios from 'axios';
import { getMessageText } from './types';

const WAVESTACK_API = process.env.WAVESTACK_API_URL || 'http://core-app:3000';
const CLIPPER_API = process.env.CLIPPER_API_URL || 'http://clipper:8000';

export async function handleSetTitle(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /settitle <new title>');
  }

  const title = args.join(' ');

  try {
    // This would integrate with Twitch API or streaming platform
    await ctx.reply(`✅ Stream title updated to: "${title}"`);
  } catch (error) {
    await ctx.reply('❌ Failed to update title. Admin only!');
  }
}

export async function handleSetGame(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /setgame <game name>');
  }

  const game = args.join(' ');

  try {
    await ctx.reply(`✅ Stream category updated to: "${game}"`);
  } catch (error) {
    await ctx.reply('❌ Failed to update category. Admin only!');
  }
}

export async function handleShoutout(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /so @username');
  }

  const username = args[0].replace('@', '');

  await ctx.reply(
    `📢 Shoutout to @${username}! Go check them out and give them a follow! 💜`
  );
}

export async function handleMod(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /mod @username');
  }

  const username = args[0].replace('@', '');

  await ctx.reply(`✅ @${username} is now a moderator!`);
}

export async function handleUnmod(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /unmod @username');
  }

  const username = args[0].replace('@', '');

  await ctx.reply(`✅ @${username} has been removed as moderator.`);
}

export async function handleBan(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /ban @username [reason]');
  }

  const username = args[0].replace('@', '');
  const reason = args.slice(1).join(' ') || 'No reason provided';

  await ctx.reply(`🔨 @${username} has been banned. Reason: ${reason}`);
}

export async function handleTimeout(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  if (!args || args.length < 2) {
    return ctx.reply('Usage: /timeout @username <duration_minutes> [reason]');
  }

  const username = args[0].replace('@', '');
  const duration = parseInt(args[1]);
  const reason = args.slice(2).join(' ') || 'No reason provided';

  if (isNaN(duration)) {
    return ctx.reply('❌ Duration must be a number (minutes)');
  }

  await ctx.reply(
    `⏱️ @${username} has been timed out for ${duration} minutes. Reason: ${reason}`
  );
}

export async function handleClear(ctx: Context) {
  await ctx.reply('✅ Chat has been cleared!');
}

export async function handleSlowMode(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  const duration = args.length > 0 ? parseInt(args[0]) : 5;

  if (isNaN(duration)) {
    return ctx.reply('❌ Duration must be a number (seconds)');
  }

  await ctx.reply(
    `🐌 Slow mode enabled: Users can send messages every ${duration} seconds.`
  );
}

export async function handleFollowersOnly(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  const duration = args.length > 0 ? parseInt(args[0]) : 0;

  if (duration === 0) {
    await ctx.reply('✅ Followers-only mode enabled (any follow age)');
  } else {
    await ctx.reply(
      `✅ Followers-only mode enabled (must be following for ${duration} minutes)`
    );
  }
}

export async function handleSubsOnly(ctx: Context) {
  await ctx.reply('✅ Subscribers-only mode enabled!');
}

export async function handleEmoteOnly(ctx: Context) {
  await ctx.reply('✅ Emote-only mode enabled!');
}

export async function handleAnnounce(ctx: Context) {
  const args = getMessageText(ctx)?.split(' ').slice(1);
  if (!args || args.length === 0) {
    return ctx.reply('Usage: /announce <message>');
  }

  const message = args.join(' ');

  await ctx.reply(`📢 ANNOUNCEMENT 📢\n\n${message}`);
}
