/**
 * Command Handler
 * Routes commands to appropriate handlers
 */
import { Telegraf, Context } from 'telegraf';
import { Logger } from 'pino';
import { RedisClientType } from 'redis';

// Import all command modules
import * as clipCommands from './clip';
import * as economyCommands from './economy';
import * as triviaCommands from './trivia';
import * as adminCommands from './admin';
import * as funCommands from './fun';
import * as infoCommands from './info';

export class CommandHandler {
  private bot: Telegraf;
  private redis: RedisClientType;
  private logger: Logger;
  private commands: Map<string, (ctx: Context) => Promise<void>>;

  constructor(bot: Telegraf, redis: RedisClientType, logger: Logger) {
    this.bot = bot;
    this.redis = redis;
    this.logger = logger;
    this.commands = new Map();

    this.registerCommands();
  }

  private registerCommands() {
    // Clip commands
    this.commands.set('clip', clipCommands.handleClip);
    this.commands.set('highlights', clipCommands.handleHighlights);

    // Economy commands
    this.commands.set('points', economyCommands.handlePoints);
    this.commands.set('daily', economyCommands.handleDaily);
    this.commands.set('leaderboard', economyCommands.handleLeaderboard);
    this.commands.set('give', economyCommands.handleGive);
    this.commands.set('gamble', economyCommands.handleGamble);

    // Trivia commands
    this.commands.set('trivia', triviaCommands.handleTrivia);

    // Fun commands
    this.commands.set('dice', funCommands.handleDice);
    this.commands.set('roll', funCommands.handleDice);
    this.commands.set('coinflip', funCommands.handleCoinFlip);
    this.commands.set('flip', funCommands.handleCoinFlip);
    this.commands.set('8ball', funCommands.handle8Ball);
    this.commands.set('rps', funCommands.handleRPS);
    this.commands.set('meme', funCommands.handleMeme);
    this.commands.set('joke', funCommands.handleJoke);
    this.commands.set('pet', funCommands.handlePet);
    this.commands.set('hug', funCommands.handleHug);
    this.commands.set('highfive', funCommands.handleHighFive);
    this.commands.set('dab', funCommands.handleDab);
    this.commands.set('dance', funCommands.handleDance);

    // Info commands
    this.commands.set('commands', infoCommands.handleCommands);
    this.commands.set('help', infoCommands.handleHelp);
    this.commands.set('about', infoCommands.handleAbout);
    this.commands.set('stats', infoCommands.handleStats);
    this.commands.set('uptime', infoCommands.handleUptime);
    this.commands.set('ping', infoCommands.handlePing);
    this.commands.set('schedule', infoCommands.handleSchedule);
    this.commands.set('viewers', infoCommands.handleViewers);

    // Admin commands (could add permission checks)
    this.commands.set('settitle', adminCommands.handleSetTitle);
    this.commands.set('setgame', adminCommands.handleSetGame);
    this.commands.set('so', adminCommands.handleShoutout);
    this.commands.set('shoutout', adminCommands.handleShoutout);
    this.commands.set('mod', adminCommands.handleMod);
    this.commands.set('unmod', adminCommands.handleUnmod);
    this.commands.set('ban', adminCommands.handleBan);
    this.commands.set('timeout', adminCommands.handleTimeout);
    this.commands.set('clear', adminCommands.handleClear);
    this.commands.set('slow', adminCommands.handleSlowMode);
    this.commands.set('slowmode', adminCommands.handleSlowMode);
    this.commands.set('followers', adminCommands.handleFollowersOnly);
    this.commands.set('subs', adminCommands.handleSubsOnly);
    this.commands.set('emoteonly', adminCommands.handleEmoteOnly);
    this.commands.set('announce', adminCommands.handleAnnounce);

    this.logger.info(`Registered ${this.commands.size} commands`);
  }

  async handle(ctx: Context) {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    if (!text || !text.startsWith('/')) return;

    const parts = text.split(' ');
    const command = parts[0].slice(1).toLowerCase().split('@')[0]; // Remove / and bot mention

    const handler = this.commands.get(command);

    if (handler) {
      try {
        await handler(ctx);
      } catch (error) {
        this.logger.error({ err: error, command }, 'Command error');
        await ctx.reply('❌ An error occurred while executing that command.');
      }
    }
  }

  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }
}
