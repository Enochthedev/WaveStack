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
import { MessageClassifier } from './services/message-classifier';
import { NlpResponder } from './services/nlp-responder';
import { HypeReporter } from './services/hype-reporter';

config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const redis = createRedisClient({ url: process.env.REDIS_URL });

const CORE_API_URL = process.env.CORE_API_URL || 'http://core-api:3000/api';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || '';

/**
 * Fetch all active Twitch accounts from core-app.
 * Returns channel handles (e.g. ["streamer1", "streamer2"]).
 * Falls back to TWITCH_CHANNELS env var for local dev without core-app running.
 */
async function fetchActiveChannels(): Promise<string[]> {
  try {
    const res = await fetch(
      `${CORE_API_URL}/v1/internal/platforms/accounts?platform=twitch`,
      { headers: { 'x-internal-service': INTERNAL_SERVICE_SECRET } },
    );
    if (!res.ok) throw new Error(`core-app responded ${res.status}`);
    const accounts = (await res.json()) as Array<{ orgId: string; accountHandle?: string }>;
    const channels = accounts
      .map((a) => a.accountHandle)
      .filter((h): h is string => Boolean(h));
    // Build channel → orgId map for model routing
    accounts.forEach((a) => {
      if (a.accountHandle && a.orgId) channelOrgMap.set(a.accountHandle.toLowerCase(), a.orgId);
    });
    if (channels.length > 0) {
      logger.info({ channels }, 'Loaded Twitch channels from DB');
      return channels;
    }
  } catch (err) {
    logger.warn({ err }, 'Could not fetch channels from core-app — falling back to env');
  }
  const envChannels = (process.env.TWITCH_CHANNELS || '')
    .split(',').map((c) => c.trim()).filter(Boolean);
  if (envChannels.length > 0) return envChannels;
  throw new Error(
    'No Twitch channels configured. Connect a Twitch account via the dashboard or set TWITCH_CHANNELS in .env',
  );
}

// Initialised in start() once we know which channels to join
let client: tmi.Client;

// Services (initialised in start())
let commandHandler: CommandHandler;
let clipService: ClipService;
let obsService: OBSService;
let moderationService: ModerationService;
let autoClipDetector: AutoClipDetector;
let messageClassifier: MessageClassifier;
let nlpResponder: NlpResponder;
let hypeReporter: HypeReporter;

// Channel → orgId map (populated from DB accounts, used for per-org model routing)
const channelOrgMap = new Map<string, string>();

async function start() {
  try {
    // Connect to Redis
    await redis.connect();
    logger.info('✅ Connected to Redis');

    // Resolve channels from DB (with env fallback for dev)
    const channels = await fetchActiveChannels();

    // Build Twitch client now that we have channels
    // Bot identity (username + oauth) is app-level — the shared WaveStack bot account.
    // Per-org credentials (streamer tokens) are stored in DB and used for API calls, not chat.
    client = new tmi.Client({
      options: { debug: false },
      connection: { reconnect: true, secure: true },
      identity: {
        username: process.env.TWITCH_BOT_USERNAME!,
        password: process.env.TWITCH_BOT_OAUTH!,
      },
      channels,
    });

    // Initialize services
    commandHandler    = new CommandHandler(client, redis, logger);
    clipService       = new ClipService(client, redis, logger);
    moderationService = new ModerationService(client, redis, logger);
    autoClipDetector  = new AutoClipDetector(client, redis, logger, clipService);
    messageClassifier = new MessageClassifier(logger);
    nlpResponder      = new NlpResponder(redis as any, logger);
    hypeReporter      = new HypeReporter(redis, logger);
    hypeReporter.start();

    // Initialize OBS if configured
    if (process.env.OBS_WEBSOCKET_URL && process.env.OBS_WEBSOCKET_PASSWORD) {
      obsService = new OBSService(redis, logger);
      await obsService.connect();
      logger.info('✅ Connected to OBS');
    }

    // Connect to Twitch
    await client.connect();
    logger.info({ channels }, '✅ Connected to Twitch');

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

    // Increment hype reporter counter for every allowed message
    hypeReporter.tick();

    // Classify message category (async, non-blocking for chat flow)
    const classification = await messageClassifier.classify(message, userstate.username);
    logger.debug({ category: classification.category, confidence: classification.confidence }, '[classifier]');

    // ── Command handling ─────────────────────────────────────────────────
    if (
      classification.category === 'command' ||
      message.startsWith(process.env.COMMAND_PREFIX ?? '!')
    ) {
      await commandHandler.handle(channel, userstate, message);
      return; // commands are structured — don't also NLP-respond
    }

    // ── Auto-clip detection ──────────────────────────────────────────────
    if (process.env.AUTO_CLIP_ENABLED === 'true') {
      await autoClipDetector.checkMessage(channel, userstate, message);
    }

    // ── NLP natural response (questions + @mentions) ─────────────────────
    // Resolve the orgId for this channel so the model-router can use the
    // right personal model and save the interaction to the right training bucket.
    const channelName = channel.replace('#', '').toLowerCase();
    const orgId = channelOrgMap.get(channelName) ?? process.env.DEFAULT_ORG_ID ?? '';

    if (orgId) {
      const reply = await nlpResponder.maybeRespond({
        orgId,
        channel,
        username: userstate.username ?? 'viewer',
        message,
        category: classification.category,
        chatHistory: [], // TODO: wire in a sliding window from Redis chat log
      });
      if (reply.shouldRespond && reply.response) {
        await client.say(channel, `@${userstate.username} ${reply.response}`);
      }
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
async function shutdown() {
  logger.info('Shutting down gracefully...');
  if (hypeReporter) hypeReporter.stop();
  if (obsService) await obsService.disconnect();
  await client.disconnect();
  await redis.quit();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();

export { client, redis, logger };
