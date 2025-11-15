/**
 * WaveStack Twitch Bot
 * Professional Twitch chat bot with OBS integration and clip automation
 */
import * as tmi from 'tmi.js';
import { config } from 'dotenv';
import pino from 'pino';
import { createClient as createRedisClient } from 'redis';
import { CommandHandler } from './commands/handler';
import { ClipService } from './services/clip-service';
import { OBSService } from './services/obs-service';
import { ModerationService } from './services/moderation';
import { AutoClipDetector } from './services/auto-clip-detector';

config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const redis = createRedisClient({ url: process.env.REDIS_URL });

// Initialize Twitch client
const client = new tmi.Client({
  options: { debug: false },
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME!,
    password: process.env.TWITCH_BOT_OAUTH!,
  },
  channels: [process.env.TWITCH_CHANNEL!],
});

// Initialize services
let commandHandler: CommandHandler;
let clipService: ClipService;
let obsService: OBSService;
let moderationService: ModerationService;
let autoClipDetector: AutoClipDetector;

async function start() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('✅ Connected to Redis');

    // Initialize services
    commandHandler = new CommandHandler(client, redis, logger);
    clipService = new ClipService(client, redis, logger);
    moderationService = new ModerationService(client, redis, logger);
    autoClipDetector = new AutoClipDetector(client, redis, logger, clipService);

    // Initialize OBS if configured
    if (process.env.OBS_WEBSOCKET_URL && process.env.OBS_WEBSOCKET_PASSWORD) {
      obsService = new OBSService(redis, logger);
      await obsService.connect();
      logger.info('✅ Connected to OBS');
    }

    // Connect to Twitch
    await client.connect();
    logger.info(`✅ Connected to Twitch channel: ${process.env.TWITCH_CHANNEL}`);

    // Set up event handlers
    setupEventHandlers();

  } catch (error) {
    logger.error({ err: error }, 'Failed to start Twitch bot');
    process.exit(1);
  }
}

function setupEventHandlers() {
  // Handle chat messages
  client.on('message', async (channel, userstate, message, self) => {
    if (self) return;

    // Moderation check
    const isAllowed = await moderationService.checkMessage(channel, userstate, message);
    if (!isAllowed) return;

    // Auto-clip detection
    if (process.env.AUTO_CLIP_ENABLED === 'true') {
      await autoClipDetector.checkMessage(channel, userstate, message);
    }

    // Command handling
    if (message.startsWith(process.env.COMMAND_PREFIX || '!')) {
      await commandHandler.handle(channel, userstate, message);
    }
  });

  // Handle subscriptions
  client.on('subscription', async (channel, username, method, message, userstate) => {
    logger.info({ username, method }, 'New subscription');

    await client.say(channel, `🎉 Thanks for subscribing, @${username}! Welcome to the ${method.plan === 'Prime' ? 'Prime' : method.plan} squad!`);

    // Auto shoutout for subs
    if (process.env.AUTO_SHOUTOUT_SUBS === 'true') {
      await client.say(channel, `Check out @${username}'s channel at twitch.tv/${username} !`);
    }
  });

  // Handle raids
  client.on('raided', async (channel, username, viewers) => {
    logger.info({ username, viewers }, 'Incoming raid');

    await client.say(channel, `🎊 RAID! Welcome ${username} and ${viewers} raiders! PogChamp`);

    // Auto shoutout for raiders
    if (process.env.AUTO_SHOUTOUT_RAIDERS === 'true') {
      setTimeout(async () => {
        await client.say(channel, `Go follow @${username} at twitch.tv/${username} !`);
      }, 3000);
    }
  });

  // Handle bits
  client.on('cheer', async (channel, userstate, message) => {
    const bits = parseInt(userstate.bits || '0');
    logger.info({ username: userstate.username, bits }, 'Bits cheered');

    await client.say(channel, `Thanks for the ${bits} bits, @${userstate.username}! KPOPheart`);
  });

  // Handle gifted subs
  client.on('submysterygift', async (channel, username, numbOfSubs, methods, userstate) => {
    logger.info({ username, numbOfSubs }, 'Gift subs');

    await client.say(channel, `💝 ${username} just gifted ${numbOfSubs} subs! You're amazing! PogChamp`);
  });

  // Handle host
  client.on('hosted', async (channel, username, viewers, autohost) => {
    if (!autohost) {
      await client.say(channel, `Thanks for the host, @${username}! Welcome ${viewers} viewers!`);
    }
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  if (obsService) await obsService.disconnect();
  await client.disconnect();
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  if (obsService) await obsService.disconnect();
  await client.disconnect();
  await redis.quit();
  process.exit(0);
});

start();

export { client, redis, logger };
