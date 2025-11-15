/**
 * Poll Command
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class PollCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    if (args.length < 3) {
      return this.client.say(channel, `Usage: !poll <question> | <option1> | <option2> [| option3...]`);
    }

    const pollText = args.join(' ');
    const parts = pollText.split('|').map(p => p.trim());

    if (parts.length < 3) {
      return this.client.say(channel, `❌ Need at least 2 options for a poll!`);
    }

    const question = parts[0];
    const options = parts.slice(1);

    // Store poll in Redis
    const pollId = `poll_${Date.now()}`;
    await this.redis.hSet(`twitch:poll:${pollId}`, {
      question,
      options: JSON.stringify(options),
      votes: JSON.stringify({}),
      createdAt: Date.now().toString(),
    });

    await this.redis.expire(`twitch:poll:${pollId}`, 300); // 5 minutes

    const optionsText = options.map((opt, i) => `${i + 1}. ${opt}`).join(' | ');

    await this.client.say(channel, `📊 POLL: ${question}`);
    await this.client.say(channel, `Options: ${optionsText}`);
    await this.client.say(channel, `Vote by typing 1, 2, 3, etc. in chat! (5 minutes)`);

    this.logger.info({ pollId, question, options }, 'Poll created');

    // End poll after 5 minutes
    setTimeout(async () => {
      const pollData = await this.redis.hGetAll(`twitch:poll:${pollId}`);
      if (!pollData.votes) return;

      const votes = JSON.parse(pollData.votes);
      const optionsArray = JSON.parse(pollData.options);

      const results = optionsArray.map((opt: string, i: number) => {
        const voteCount = Object.values(votes).filter(v => v === String(i + 1)).length;
        return `${opt}: ${voteCount} votes`;
      });

      await this.client.say(channel, `📊 Poll ended! Results: ${results.join(' | ')}`);
    }, 300000);
  }
}
