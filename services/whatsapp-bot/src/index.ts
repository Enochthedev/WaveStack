/**
 * WhatsApp Bot with AI Personality
 * Responds to messages using the creator's AI personality
 */
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { config } from 'dotenv';
import pino from 'pino';
import { PrismaClient } from '@prisma/client';
import { createClient as createRedisClient } from 'redis';
import axios from 'axios';

config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const prisma = new PrismaClient();
const redis = createRedisClient({ url: process.env.REDIS_URL });

// Configuration
const AI_PERSONALITY_URL = process.env.AI_PERSONALITY_URL || 'http://ai-personality:8200';
const CREATOR_USER_ID = process.env.CREATOR_USER_ID || 'default_user';
const AUTO_RESPOND = process.env.AUTO_RESPOND === 'true';
const RESPOND_TO_GROUPS = process.env.RESPOND_TO_GROUPS === 'true';

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

// QR code for authentication
client.on('qr', (qr) => {
  logger.info('🔐 Scan this QR code with WhatsApp:');
  qrcode.generate(qr, { small: true });
});

// Ready event
client.on('ready', async () => {
  logger.info('✅ WhatsApp bot is ready!');

  // Connect to Redis
  await redis.connect();
  logger.info('✅ Connected to Redis');
});

// Message handler
client.on('message', async (msg: Message) => {
  try {
    // Get message details
    const chat = await msg.getChat();
    const contact = await msg.getContact();
    const isGroup = chat.isGroup;

    // Skip if groups are disabled
    if (isGroup && !RESPOND_TO_GROUPS) {
      return;
    }

    // Skip own messages
    if (msg.fromMe) {
      return;
    }

    // Get message content
    const messageText = msg.body;

    logger.info({
      from: contact.pushname || contact.number,
      message: messageText,
      isGroup,
      chatName: chat.name
    }, 'Received message');

    // Save message to training data
    await saveMessageToTraining(messageText, {
      platform: 'whatsapp',
      platformUserId: contact.id._serialized,
      username: contact.pushname || contact.number,
      isGroup,
      chatId: chat.id._serialized,
      chatName: chat.name
    });

    // Check if we should respond
    const shouldRespond = await checkShouldRespond(msg, chat, isGroup);

    if (!shouldRespond) {
      return;
    }

    // Show typing indicator
    chat.sendStateTyping();

    // Generate AI response
    const response = await generateAIResponse(messageText, {
      platform: 'whatsapp',
      platformUserId: contact.id._serialized,
      username: contact.pushname || contact.number,
      channelId: chat.id._serialized,
      isGroup
    });

    if (response) {
      // Send response
      await msg.reply(response);

      logger.info({
        to: contact.pushname || contact.number,
        response: response.substring(0, 100)
      }, 'Sent AI response');

      // Track response
      await redis.hIncrBy('whatsapp:stats', 'messages_sent', 1);
    }

  } catch (error) {
    logger.error({ err: error }, 'Error handling message');
  }
});

// Group join handler
client.on('group_join', async (notification) => {
  try {
    const chat = await notification.getChat();

    // Send welcome message
    await chat.sendMessage(
      '👋 Hey everyone! I\'m here to help and chat. Feel free to @ mention me!'
    );

    logger.info({ group: chat.name }, 'Joined group');

  } catch (error) {
    logger.error({ err: error }, 'Error handling group join');
  }
});

// Command handler
async function handleCommand(msg: Message, command: string, args: string[]) {
  const chat = await msg.getChat();

  switch (command) {
    case 'help':
      await msg.reply(
        `*Available Commands:*\n\n` +
        `• *!help* - Show this help message\n` +
        `• *!about* - About this bot\n` +
        `• *!stats* - Bot statistics\n` +
        `• *!ask [question]* - Ask the AI anything\n` +
        `• *!vibe* - Get a vibe check\n\n` +
        `Just @ mention me in group chats to get a response!`
      );
      break;

    case 'about':
      await msg.reply(
        `🤖 *WaveStack AI Bot*\n\n` +
        `I'm an AI-powered bot that learns from conversations and ` +
        `responds in a natural, personalized way. The more we chat, ` +
        `the better I understand your style!`
      );
      break;

    case 'stats':
      const stats = await redis.hGetAll('whatsapp:stats');
      await msg.reply(
        `📊 *Bot Statistics*\n\n` +
        `Messages received: ${stats.messages_received || 0}\n` +
        `Messages sent: ${stats.messages_sent || 0}\n` +
        `Commands processed: ${stats.commands_processed || 0}`
      );
      break;

    case 'ask':
      if (args.length === 0) {
        await msg.reply('Please provide a question! Example: !ask What\'s the meaning of life?');
        return;
      }

      chat.sendStateTyping();

      const question = args.join(' ');
      const answer = await generateAIResponse(question, {
        platform: 'whatsapp',
        platformUserId: (await msg.getContact()).id._serialized,
        channelId: chat.id._serialized
      });

      if (answer) {
        await msg.reply(answer);
      }
      break;

    case 'vibe':
      const vibes = [
        '✨ immaculate',
        '🔥 absolutely fire',
        '💯 peak energy',
        '🌊 smooth sailing',
        '⚡ electric',
        '🎯 locked in',
        '🚀 out of this world',
        '💎 gem status'
      ];
      await msg.reply(`The vibe right now: ${vibes[Math.floor(Math.random() * vibes.length)]}`);
      break;

    default:
      await msg.reply(`Unknown command: ${command}. Type !help for available commands.`);
  }

  await redis.hIncrBy('whatsapp:stats', 'commands_processed', 1);
}

// Check if we should respond to this message
async function checkShouldRespond(msg: Message, chat: any, isGroup: boolean): Promise<boolean> {
  const messageText = msg.body;

  // Always respond to commands
  if (messageText.startsWith('!')) {
    const parts = messageText.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    await handleCommand(msg, command, args);
    return false; // Already handled
  }

  // In groups, only respond if mentioned or if AUTO_RESPOND is enabled
  if (isGroup) {
    const mentions = await msg.getMentions();
    const isMentioned = mentions.length > 0;

    if (!isMentioned && !AUTO_RESPOND) {
      return false;
    }
  }

  // In DMs, respond if AUTO_RESPOND is enabled or if it's a question
  if (!isGroup) {
    if (AUTO_RESPOND) {
      return true;
    }

    // Respond to questions
    if (messageText.includes('?')) {
      return true;
    }

    // Respond to greetings
    const greetings = ['hi', 'hello', 'hey', 'sup', 'yo'];
    if (greetings.some(g => messageText.toLowerCase().includes(g))) {
      return true;
    }

    return false;
  }

  return true;
}

// Save message to training data
async function saveMessageToTraining(message: string, metadata: any) {
  try {
    await axios.post(`${AI_PERSONALITY_URL}/api/v1/learning/train/single`, {
      user_id: CREATOR_USER_ID,
      platform: 'whatsapp',
      data_type: 'message',
      content: message,
      metadata
    });

    await redis.hIncrBy('whatsapp:stats', 'messages_received', 1);

  } catch (error) {
    logger.error({ err: error }, 'Error saving training data');
  }
}

// Generate AI response
async function generateAIResponse(message: string, context: any): Promise<string | null> {
  try {
    const response = await axios.post(
      `${AI_PERSONALITY_URL}/api/v1/personality/generate`,
      {
        user_id: CREATOR_USER_ID,
        message,
        platform: context.platform,
        channel_id: context.channelId,
        username: context.username
      },
      { timeout: 30000 }
    );

    return response.data.response;

  } catch (error) {
    logger.error({ err: error }, 'Error generating AI response');
    return null;
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  await client.destroy();
  await redis.quit();
  await prisma.$disconnect();

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the bot
client.initialize().catch((error) => {
  logger.error({ err: error }, 'Failed to initialize WhatsApp bot');
  process.exit(1);
});
