/**
 * WaveStack Discord Bot - Main Entry Point
 * Professional Discord bot with games, alerts, moderation, and streaming integrations
 */
import { Client, GatewayIntentBits, Collection, Events, REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import pino from 'pino';
import { createClient as createRedisClient } from 'redis';
import * as fs from 'fs';
import * as path from 'path';
import { StreamMonitor } from './services/stream-monitor';
import { EconomyService } from './services/economy';
import { ModerationService } from './services/moderation';
import { ClipService } from './services/clip-service';

config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Initialize Discord client with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
  ],
}) as any;

// Initialize Redis client
const redis = createRedisClient({ url: process.env.REDIS_URL });
redis.on('error', (err) => logger.error({ err }, 'Redis error'));

// Command collection
client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    logger.info(`Loaded command: ${command.data.name}`);
  }
}

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, redis, logger));
  } else {
    client.on(event.name, (...args) => event.execute(...args, redis, logger));
  }
  logger.info(`Loaded event: ${event.name}`);
}

// Initialize services
let streamMonitor: StreamMonitor;
let economyService: EconomyService;
let moderationService: ModerationService;
let clipService: ClipService;

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`✅ Discord bot ready! Logged in as ${readyClient.user.tag}`);

  // Connect to Redis
  await redis.connect();
  logger.info('✅ Connected to Redis');

  // Initialize services
  streamMonitor = new StreamMonitor(client, redis, logger);
  economyService = new EconomyService(redis, logger);
  moderationService = new ModerationService(client, redis, logger);
  clipService = new ClipService(client, redis, logger);

  // Start stream monitoring
  await streamMonitor.start();
  logger.info('✅ Stream monitoring started');

  // Set bot status
  readyClient.user.setPresence({
    activities: [{ name: 'for !help | Clips & Streams', type: 3 }],
    status: 'online',
  });
});

// Handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, redis, logger);
  } catch (error) {
    logger.error({ err: error, command: interaction.commandName }, 'Error executing command');
    const reply = { content: 'There was an error executing this command!', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// Handle errors
client.on(Events.Error, (error) => {
  logger.error({ err: error }, 'Discord client error');
});

process.on('unhandledRejection', (error) => {
  logger.error({ err: error }, 'Unhandled promise rejection');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  if (streamMonitor) streamMonitor.stop();
  await redis.quit();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  if (streamMonitor) streamMonitor.stop();
  await redis.quit();
  client.destroy();
  process.exit(0);
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);

export { client, redis, logger };
