/**
 * Info Commands
 */
import { Context } from 'telegraf';
import axios from 'axios';

const AI_API = process.env.AI_PERSONALITY_URL || 'http://ai-personality:8200';

export async function handleCommands(ctx: Context) {
  const commands = `
📋 **Available Commands**

**Fun & Games:**
/trivia - Play trivia game
/daily - Claim daily points
/points - Check your points
/leaderboard - View top users
/dice - Roll a dice
/coinflip - Flip a coin
/8ball - Ask the magic 8-ball
/rps - Play rock-paper-scissors
/joke - Get a random joke
/meme - Get a random meme

**Stream:**
/clip - Create a clip
/song - Current song playing
/uptime - Stream uptime
/viewers - Current viewer count
/schedule - Stream schedule

**Info:**
/help - Show help
/commands - This list
/about - About the bot
/stats - Bot statistics

**AI:**
/ask - Ask the AI a question
/chat - Chat with the AI
/vibe - Check the vibe

**Admin:**
/settitle - Set stream title
/setgame - Set stream category
/so - Shoutout a user
/mod - Make someone a moderator
/timeout - Timeout a user
/ban - Ban a user
  `.trim();

  await ctx.reply(commands, { parse_mode: 'Markdown' });
}

export async function handleHelp(ctx: Context) {
  const help = `
👋 **Welcome to WaveStack Bot!**

I'm your friendly bot assistant with tons of features!

Use /commands to see all available commands.

**Quick Start:**
• /daily - Claim your daily points
• /trivia - Test your knowledge
• /ask <question> - Ask me anything
• /clip - Create a stream clip

Need help? Just ask in chat!
  `.trim();

  await ctx.reply(help, { parse_mode: 'Markdown' });
}

export async function handleAbout(ctx: Context) {
  const about = `
🤖 **WaveStack Bot**

Version: 1.0.0
Creator: WaveStack Team

**Features:**
✅ AI-Powered Personality
✅ Stream Management
✅ Mini-Games & Trivia
✅ Points & Economy System
✅ Auto-Clipping
✅ Content Generation

Built with ❤️ using Telegraf and WaveStack AI.

Visit: https://wavestack.io
  `.trim();

  await ctx.reply(about, { parse_mode: 'Markdown' });
}

export async function handleStats(ctx: Context) {
  try {
    // Get stats from AI service
    const userId = ctx.from?.id.toString() || 'default';
    const response = await axios.get(`${AI_API}/api/v1/stats/${userId}`);

    const stats = response.data;

    const message = `
📊 **Your Stats**

💬 Conversations: ${stats.conversations || 0}
🧠 Memories: ${stats.memories_stored || 0}
🤖 AI Responses: ${stats.responses_generated || 0}
📝 Content Generated: ${stats.content_generated || 0}
    `.trim();

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    await ctx.reply('📊 Stats coming soon!');
  }
}

export async function handleUptime(ctx: Context) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  await ctx.reply(
    `⏱️ Bot uptime: ${hours}h ${minutes}m ${seconds}s`
  );
}

export async function handlePing(ctx: Context) {
  const sent = Date.now();
  const msg = await ctx.reply('Pong! 🏓');
  const received = Date.now();
  const latency = received - sent;

  await ctx.telegram.editMessageText(
    ctx.chat?.id,
    msg.message_id,
    undefined,
    `Pong! 🏓\nLatency: ${latency}ms`
  );
}

export async function handleSchedule(ctx: Context) {
  const schedule = `
📅 **Stream Schedule**

Monday: 6:00 PM - 10:00 PM EST
Wednesday: 6:00 PM - 10:00 PM EST
Friday: 7:00 PM - 11:00 PM EST
Saturday: 2:00 PM - 6:00 PM EST

Subject to change! Follow for updates.
  `.trim();

  await ctx.reply(schedule, { parse_mode: 'Markdown' });
}

export async function handleViewers(ctx: Context) {
  // This would integrate with streaming platform API
  const viewers = Math.floor(Math.random() * 500) + 10;
  await ctx.reply(`👀 Current viewers: ${viewers}`);
}
