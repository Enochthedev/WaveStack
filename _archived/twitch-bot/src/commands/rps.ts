/**
 * Rock Paper Scissors Command for Twitch
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class RPSCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;
  private activeGames: Map<string, { choice: string, timeout: NodeJS.Timeout }> = new Map();

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    const choice = args[0]?.toLowerCase();

    if (!choice || !['rock', 'paper', 'scissors'].includes(choice)) {
      await this.client.say(
        channel,
        `@${userstate.username} Usage: !rps [rock/paper/scissors] 🪨📄✂️`
      );
      return;
    }

    const botChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
    const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

    let result: string;
    let points = 0;

    if (choice === botChoice) {
      result = "It's a tie! 🤝";
      points = 5;
    } else if (
      (choice === 'rock' && botChoice === 'scissors') ||
      (choice === 'paper' && botChoice === 'rock') ||
      (choice === 'scissors' && botChoice === 'paper')
    ) {
      result = 'You win! 🎉';
      points = 15;
    } else {
      result = 'You lose! 😢';
      points = 0;
    }

    // Award points
    if (points > 0) {
      const pointsKey = `twitch:user:${userstate.username}:points`;
      await this.redis.incrBy(pointsKey, points);
    }

    await this.client.say(
      channel,
      `@${userstate.username} ${emojis[choice as keyof typeof emojis]} vs ${emojis[botChoice as keyof typeof emojis]} → ${result}${points > 0 ? ` (+${points} points)` : ''}`
    );
  }
}
