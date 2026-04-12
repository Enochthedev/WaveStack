/**
 * Dice Roll Command for Twitch
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

export class DiceCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    let numDice = 1;
    let numSides = 6;

    // Parse dice notation (e.g., "2d20" or just "20")
    if (args[0]) {
      const diceMatch = args[0].match(/^(\d+)?d(\d+)$/i);
      if (diceMatch) {
        numDice = parseInt(diceMatch[1] || '1');
        numSides = parseInt(diceMatch[2]);
      } else {
        numSides = parseInt(args[0]) || 6;
      }
    }

    numDice = Math.min(numDice, 10);
    numSides = Math.min(numSides, 100);

    const rolls: number[] = [];
    let total = 0;

    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * numSides) + 1;
      rolls.push(roll);
      total += roll;
    }

    const rollsText = numDice > 1 ? ` [${rolls.join(', ')}]` : '';

    await this.client.say(
      channel,
      `🎲 @${userstate.username} rolled ${numDice}d${numSides}${rollsText} = ${total}`
    );
  }
}
