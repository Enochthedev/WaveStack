/**
 * Command Handler for Twitch Bot
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import { ClipCommand } from './clip';
import { PointsCommand } from './points';
import { LeaderboardCommand } from './leaderboard';
import { TitleCommand } from './title';
import { GameCommand } from './game';
import { ShoutoutCommand } from './shoutout';
import { PollCommand } from './poll';
import { RaidCommand } from './raid';
import { OBSCommands } from './obs';
import { RPSCommand } from './rps';
import { EightBallCommand } from './8ball';
import { DiceCommand } from './dice';
import { CoinflipCommand } from './coinflip';
import { TriviaCommand } from './trivia';

export class CommandHandler {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;
  private cooldowns: Map<string, number> = new Map();

  private commands: Map<string, any> = new Map();
  private triviaCommand: TriviaCommand;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;

    // Register commands
    this.commands.set('clip', new ClipCommand(client, redis, logger));
    this.commands.set('points', new PointsCommand(client, redis, logger));
    this.commands.set('leaderboard', new LeaderboardCommand(client, redis, logger));
    this.commands.set('title', new TitleCommand(client, redis, logger));
    this.commands.set('settitle', new TitleCommand(client, redis, logger));
    this.commands.set('game', new GameCommand(client, redis, logger));
    this.commands.set('setgame', new GameCommand(client, redis, logger));
    this.commands.set('so', new ShoutoutCommand(client, redis, logger));
    this.commands.set('shoutout', new ShoutoutCommand(client, redis, logger));
    this.commands.set('poll', new PollCommand(client, redis, logger));
    this.commands.set('raid', new RaidCommand(client, redis, logger));

    // OBS commands
    const obsCommands = new OBSCommands(client, redis, logger);
    this.commands.set('scene', obsCommands);
    this.commands.set('source', obsCommands);
    this.commands.set('startstream', obsCommands);
    this.commands.set('stopstream', obsCommands);

    // Game commands
    this.commands.set('rps', new RPSCommand(client, redis, logger));
    this.commands.set('8ball', new EightBallCommand(client, redis, logger));
    this.commands.set('roll', new DiceCommand(client, redis, logger));
    this.commands.set('dice', new DiceCommand(client, redis, logger));
    this.commands.set('coinflip', new CoinflipCommand(client, redis, logger));
    this.triviaCommand = new TriviaCommand(client, redis, logger);
    this.commands.set('trivia', this.triviaCommand);
  }

  async handle(channel: string, userstate: tmi.ChatUserstate, message: string) {
    // Check for trivia answers (even without prefix)
    const triviaAnswered = await this.triviaCommand.checkAnswer(channel, userstate, message);
    if (triviaAnswered) return;

    const prefix = process.env.COMMAND_PREFIX || '!';
    if (!message.startsWith(prefix)) return;

    const args = message.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    const command = this.commands.get(commandName);
    if (!command) return;

    // Check cooldown
    const cooldownKey = `${userstate.username}:${commandName}`;
    const lastUsed = this.cooldowns.get(cooldownKey);
    const cooldown = parseInt(process.env.COMMAND_COOLDOWN || '3000');

    if (lastUsed && Date.now() - lastUsed < cooldown) {
      return; // Still on cooldown
    }

    // Check permissions
    const isMod = userstate.mod || userstate['user-type'] === 'mod';
    const isBroadcaster = userstate['username'] === channel.replace('#', '');
    const isVIP = userstate['badges']?.vip === '1';

    const modOnlyCommands = (process.env.MOD_ONLY_COMMANDS || '').split(',');
    const vipOnlyCommands = (process.env.VIP_ONLY_COMMANDS || '').split(',');

    if (modOnlyCommands.includes(commandName) && !isMod && !isBroadcaster) {
      return this.client.say(channel, `@${userstate.username}, this command is mod-only.`);
    }

    if (vipOnlyCommands.includes(commandName) && !isVIP && !isMod && !isBroadcaster) {
      return this.client.say(channel, `@${userstate.username}, this command is VIP-only.`);
    }

    // Execute command
    try {
      await command.execute(channel, userstate, args);
      this.cooldowns.set(cooldownKey, Date.now());

      this.logger.debug({
        username: userstate.username,
        command: commandName,
        args,
      }, 'Command executed');

    } catch (error) {
      this.logger.error({ err: error, command: commandName }, 'Error executing command');
      await this.client.say(channel, `@${userstate.username}, something went wrong!`);
    }
  }
}
