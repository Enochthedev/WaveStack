/**
 * Magic 8-Ball Command for Twitch
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

const responses = [
  'It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes definitely.',
  'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.',
  'Yes.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.',
  'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.',
  'Don\'t count on it.', 'My reply is no.', 'My sources say no.',
  'Outlook not so good.', 'Very doubtful.',
];

export class EightBallCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    if (args.length === 0) {
      await this.client.say(
        channel,
        `@${userstate.username} Ask me a yes/no question! Usage: !8ball <question>`
      );
      return;
    }

    const question = args.join(' ');
    const response = responses[Math.floor(Math.random() * responses.length)];

    await this.client.say(
      channel,
      `🔮 @${userstate.username} asks: "${question}" → ${response}`
    );
  }
}
