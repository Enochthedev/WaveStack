/**
 * WaveStack Telegram Bot
 * Full-featured Telegram bot with AI personality integration
 */
import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from 'dotenv';
import pino from 'pino';
import { createClient as createRedisClient } from 'redis';
import { CommandHandler } from './commands/handler';
import { AIPersonality } from './services/ai-personality';
import { EconomyService } from './services/economy';

config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const redis = createRedisClient({ url: process.env.REDIS_URL });

// Initialize bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Initialize services
let commandHandler: CommandHandler;
let aiPersonality: AIPersonality;
let economyService: EconomyService;

async function start() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('✅ Connected to Redis');

    // Initialize services
    commandHandler = new CommandHandler(bot, redis, logger);
    economyService = new EconomyService(redis, logger);

    // Initialize AI personality if enabled
    if (process.env.AI_ENABLED === 'true') {
      aiPersonality = new AIPersonality(redis, logger);
      logger.info('✅ AI Personality initialized');
    }

    // Setup handlers
    setupHandlers();

    // Launch bot
    await bot.launch();
    logger.info('✅ Telegram bot started');

  } catch (error) {
    logger.error({ err: error }, 'Failed to start Telegram bot');
    process.exit(1);
  }
}

function setupHandlers() {
  // Start command
  bot.start((ctx) => {
    ctx.reply(
      '👋 Welcome to WaveStack!\n\n' +
      '🎬 /clip - Create stream clips\n' +
      '💰 /points - Check your points\n' +
      '🎮 /trivia - Play trivia game\n' +
      '🎁 /daily - Claim daily reward\n' +
      '🏆 /leaderboard - View rankings\n' +
      '🎵 /song - Request a song\n' +
      '📊 /stats - Stream statistics\n' +
      '💬 /ask - Ask the AI anything\n' +
      '❓ /help - Show all commands'
    );
  });

  // Help command
  bot.help((ctx) => {
    ctx.reply(
      '📖 **WaveStack Bot Commands**\n\n' +
      '**Clips & Media**\n' +
      '/clip [duration] - Create a clip\n' +
      '/highlights - Recent highlights\n' +
      '/song [request] - Song request\n\n' +
      '**Economy & Games**\n' +
      '/points [@user] - Check points\n' +
      '/daily - Daily reward\n' +
      '/trivia - Play trivia\n' +
      '/roll [max] - Roll dice\n' +
      '/flip - Flip a coin\n' +
      '/8ball <question> - Magic 8-ball\n\n' +
      '**Social**\n' +
      '/leaderboard - Top users\n' +
      '/stats - Stream stats\n' +
      '/uptime - Stream uptime\n' +
      '/schedule - Stream schedule\n\n' +
      '**AI Features**\n' +
      '/ask <question> - Ask AI anything\n' +
      '/chat - Chat with AI clone\n' +
      '/vibe - Get AI vibe check\n\n' +
      '**Utility**\n' +
      '/weather [city] - Weather info\n' +
      '/time [timezone] - Current time\n' +
      '/remind <time> <message> - Set reminder',
      { parse_mode: 'Markdown' }
    );
  });

  // Handle text messages
  bot.on(message('text'), async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id.toString();

    // Award points for activity
    await economyService.awardMessagePoints(userId);

    // Check if it's a command
    if (text.startsWith('/')) {
      await commandHandler.handle(ctx);
    }
    // AI personality response (if enabled and mentioned)
    else if (aiPersonality && (ctx.message.reply_to_message || text.includes('@'))) {
      const response = await aiPersonality.generateResponse(userId, text, {
        platform: 'telegram',
        chatId: ctx.chat.id.toString(),
        username: ctx.from.username,
      });

      if (response) {
        await ctx.reply(response, { reply_to_message_id: ctx.message.message_id });
      }
    }
  });

  // Handle photos (for clip thumbnails, etc.)
  bot.on(message('photo'), async (ctx) => {
    logger.info({ userId: ctx.from.id }, 'Photo received');
    // Could process and use for clip thumbnails
  });

  // Error handling
  bot.catch((err, ctx) => {
    logger.error({ err, userId: ctx.from?.id }, 'Bot error');
  });
}

// Graceful shutdown
process.once('SIGINT', () => {
  bot.stop('SIGINT');
  redis.quit();
});

process.once('SIGTERM', () => {
  bot.stop('SIGTERM');
  redis.quit();
});

start();

export { bot, redis, logger };
