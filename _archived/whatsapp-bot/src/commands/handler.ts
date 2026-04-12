/**
 * WhatsApp Command Handler
 */
import { Client, Message } from 'whatsapp-web.js';
import { Logger } from 'pino';
import { RedisClientType } from 'redis';
import { EconomyService } from '../services/economy';
import { AIPersonality } from '../services/ai-personality';
import axios from 'axios';

const CLIPPER_API = process.env.CLIPPER_API_URL || 'http://clipper:8000';
const AI_API = process.env.AI_PERSONALITY_URL || 'http://ai-personality:8200';

export class CommandHandler {
  private client: Client;
  private redis: RedisClientType;
  private logger: Logger;
  private economy: EconomyService;
  private ai?: AIPersonality;
  private commands: Map<string, (msg: Message, args: string[]) => Promise<void>>;

  constructor(
    client: Client,
    redis: RedisClientType,
    logger: Logger,
    economy: EconomyService,
    ai?: AIPersonality
  ) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
    this.economy = economy;
    this.ai = ai;
    this.commands = new Map();

    this.registerCommands();
  }

  private registerCommands() {
    // Help & Info
    this.commands.set('help', this.handleHelp.bind(this));
    this.commands.set('commands', this.handleCommands.bind(this));
    this.commands.set('about', this.handleAbout.bind(this));
    this.commands.set('stats', this.handleStats.bind(this));

    // Clips
    this.commands.set('clip', this.handleClip.bind(this));
    this.commands.set('highlights', this.handleHighlights.bind(this));

    // Economy
    this.commands.set('points', this.handlePoints.bind(this));
    this.commands.set('balance', this.handlePoints.bind(this));
    this.commands.set('daily', this.handleDaily.bind(this));
    this.commands.set('leaderboard', this.handleLeaderboard.bind(this));
    this.commands.set('top', this.handleLeaderboard.bind(this));

    // Fun
    this.commands.set('trivia', this.handleTrivia.bind(this));
    this.commands.set('dice', this.handleDice.bind(this));
    this.commands.set('roll', this.handleDice.bind(this));
    this.commands.set('flip', this.handleCoinFlip.bind(this));
    this.commands.set('coinflip', this.handleCoinFlip.bind(this));
    this.commands.set('8ball', this.handle8Ball.bind(this));
    this.commands.set('joke', this.handleJoke.bind(this));

    // AI
    this.commands.set('ask', this.handleAsk.bind(this));
    this.commands.set('chat', this.handleChat.bind(this));

    // Stream
    this.commands.set('uptime', this.handleUptime.bind(this));
    this.commands.set('schedule', this.handleSchedule.bind(this));

    this.logger.info(`Registered ${this.commands.size} WhatsApp commands`);
  }

  async handle(msg: Message) {
    const text = msg.body;
    if (!text.startsWith('!')) return;

    const parts = text.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const handler = this.commands.get(command);

    if (handler) {
      try {
        await handler(msg, args);
      } catch (error) {
        this.logger.error({ err: error, command }, 'Command error');
        await msg.reply('❌ An error occurred while executing that command.');
      }
    }
  }

  private async handleHelp(msg: Message) {
    await msg.reply(
      '👋 *WaveStack Bot Commands*\n\n' +
      '*Clips & Media*\n' +
      '!clip [duration] - Create a clip\n' +
      '!highlights - Recent clips\n\n' +
      '*Economy*\n' +
      '!points - Check your points\n' +
      '!daily - Daily reward\n' +
      '!leaderboard - Top users\n\n' +
      '*Fun*\n' +
      '!trivia - Play trivia\n' +
      '!dice - Roll dice\n' +
      '!flip - Flip a coin\n' +
      '!8ball <question> - Magic 8-ball\n' +
      '!joke - Random joke\n\n' +
      '*AI*\n' +
      '!ask <question> - Ask AI\n' +
      '!chat - Chat with AI\n\n' +
      '*Info*\n' +
      '!commands - All commands\n' +
      '!about - About the bot\n' +
      '!stats - Your statistics'
    );
  }

  private async handleCommands(msg: Message) {
    const cmdList = Array.from(this.commands.keys()).sort().join(', ');
    await msg.reply(`📋 Available commands:\n\n!${cmdList.replace(/,/g, ', !')}`);
  }

  private async handleAbout(msg: Message) {
    await msg.reply(
      '🤖 *WaveStack Bot*\n\n' +
      'Version: 1.0.0\n' +
      'Platform: WhatsApp\n\n' +
      'Features:\n' +
      '✅ AI-Powered Personality\n' +
      '✅ Stream Clipping\n' +
      '✅ Economy System\n' +
      '✅ Mini-Games\n' +
      '✅ And more!\n\n' +
      'Built with ❤️ by WaveStack'
    );
  }

  private async handleStats(msg: Message) {
    try {
      const userId = msg.from;
      const response = await axios.get(`${AI_API}/api/v1/stats/${userId}`);
      const stats = response.data;

      await msg.reply(
        '📊 *Your Stats*\n\n' +
        `💬 Conversations: ${stats.conversations || 0}\n` +
        `🧠 Memories: ${stats.memories_stored || 0}\n` +
        `🤖 AI Responses: ${stats.responses_generated || 0}\n` +
        `📝 Content Generated: ${stats.content_generated || 0}`
      );
    } catch (error) {
      await msg.reply('📊 Stats coming soon!');
    }
  }

  private async handleClip(msg: Message, args: string[]) {
    const duration = args.length > 0 ? parseInt(args[0]) : 30;

    if (isNaN(duration) || duration < 5 || duration > 60) {
      return msg.reply('❌ Duration must be between 5 and 60 seconds');
    }

    await msg.reply('🎬 Creating clip...');

    try {
      const streamUrl = process.env.STREAM_URL || 'https://twitch.tv/your_channel';
      const response = await axios.post(`${CLIPPER_API}/api/v1/clip`, {
        source: streamUrl,
        start_sec: -5,
        duration_sec: duration,
      });

      await msg.reply(`✅ Clip created! ID: ${response.data.clip_id}`);
    } catch (error: any) {
      await msg.reply(`❌ Error: ${error.message}`);
    }
  }

  private async handleHighlights(msg: Message) {
    await msg.reply('🎬 Recent highlights coming soon!');
  }

  private async handlePoints(msg: Message) {
    const userId = msg.from;
    const points = await this.redis.get(`points:${userId}`);
    const displayPoints = points ? parseInt(points) : 0;

    await msg.reply(`💰 You have *${displayPoints}* points!`);
  }

  private async handleDaily(msg: Message) {
    const userId = msg.from;
    const lastDaily = await this.redis.get(`daily:${userId}`);
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;

    if (lastDaily && now - parseInt(lastDaily) < dayInMs) {
      const timeLeft = dayInMs - (now - parseInt(lastDaily));
      const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
      return msg.reply(`⏱️ You already claimed your daily! Try again in ${hoursLeft} hours.`);
    }

    const reward = 100;
    await this.redis.incrBy(`points:${userId}`, reward);
    await this.redis.set(`daily:${userId}`, now.toString());

    await msg.reply(`🎁 Daily reward claimed! +${reward} points!`);
  }

  private async handleLeaderboard(msg: Message) {
    await msg.reply(
      '🏆 *Top Users*\n\n' +
      '1. User1 - 5000 pts\n' +
      '2. User2 - 4500 pts\n' +
      '3. User3 - 4000 pts\n' +
      '...'
    );
  }

  private async handleTrivia(msg: Message) {
    await msg.reply('🎯 Trivia coming soon!');
  }

  private async handleDice(msg: Message) {
    const roll = Math.floor(Math.random() * 6) + 1;
    await msg.reply(`🎲 You rolled a ${roll}!`);
  }

  private async handleCoinFlip(msg: Message) {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    await msg.reply(`🪙 ${result}!`);
  }

  private async handle8Ball(msg: Message, args: string[]) {
    const responses = [
      'Yes, definitely!',
      'It is certain.',
      'Most likely.',
      'Ask again later.',
      'Cannot predict now.',
      'Don\'t count on it.',
      'Very doubtful.',
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    await msg.reply(`🎱 ${response}`);
  }

  private async handleJoke(msg: Message) {
    const jokes = [
      'Why do programmers prefer dark mode? Because light attracts bugs! 🐛',
      'Why did the developer go broke? Because he used up all his cache! 💰',
      'How many programmers does it take to change a light bulb? None, that\'s a hardware problem!',
    ];

    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    await msg.reply(`😂 ${joke}`);
  }

  private async handleAsk(msg: Message, args: string[]) {
    if (args.length === 0) {
      return msg.reply('Usage: !ask <question>');
    }

    const question = args.join(' ');

    if (!this.ai) {
      return msg.reply('❌ AI is not enabled');
    }

    const response = await this.ai.generateResponse(msg.from, question, {
      platform: 'whatsapp',
    });

    if (response) {
      await msg.reply(response);
    } else {
      await msg.reply('❌ Could not generate response');
    }
  }

  private async handleChat(msg: Message) {
    await msg.reply('💬 Just send me a message and I\'ll respond! Use !ask for specific questions.');
  }

  private async handleUptime(msg: Message) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    await msg.reply(`⏱️ Bot uptime: ${hours}h ${minutes}m`);
  }

  private async handleSchedule(msg: Message) {
    await msg.reply(
      '📅 *Stream Schedule*\n\n' +
      'Monday: 6:00 PM - 10:00 PM EST\n' +
      'Wednesday: 6:00 PM - 10:00 PM EST\n' +
      'Friday: 7:00 PM - 11:00 PM EST\n' +
      'Saturday: 2:00 PM - 6:00 PM EST'
    );
  }
}
