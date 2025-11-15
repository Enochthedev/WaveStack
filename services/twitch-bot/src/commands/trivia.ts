/**
 * Trivia Command for Twitch
 */
import * as tmi from 'tmi.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

const triviaQuestions = [
  { q: 'What is the capital of France?', a: 'paris', points: 10 },
  { q: 'Which programming language is known as the "language of the web"?', a: 'javascript', points: 15 },
  { q: 'What year was the first iPhone released?', a: '2007', points: 15 },
  { q: 'Which planet is known as the Red Planet?', a: 'mars', points: 10 },
  { q: 'What is the largest ocean on Earth?', a: 'pacific', points: 10 },
  { q: 'Who painted the Mona Lisa?', a: 'da vinci', points: 15 },
  { q: 'What is the speed of light in km/s?', a: '300000', points: 20 },
  { q: 'What is the chemical symbol for gold?', a: 'au', points: 15 },
  { q: 'How many continents are there?', a: '7', points: 10 },
  { q: 'What is the smallest country in the world?', a: 'vatican', points: 15 },
];

export class TriviaCommand {
  private client: tmi.Client;
  private redis: RedisClientType;
  private logger: Logger;
  private activeTrivia: Map<string, { question: any, timeout: NodeJS.Timeout }> = new Map();

  constructor(client: tmi.Client, redis: RedisClientType, logger: Logger) {
    this.client = client;
    this.redis = redis;
    this.logger = logger;
  }

  async execute(channel: string, userstate: tmi.ChatUserstate, args: string[]) {
    // Check if trivia is already active
    if (this.activeTrivia.has(channel)) {
      await this.client.say(channel, `@${userstate.username} Trivia already in progress! Answer the current question.`);
      return;
    }

    // Select random question
    const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

    await this.client.say(
      channel,
      `🧠 TRIVIA TIME! ${question.q} (${question.points} points) | You have 30 seconds to answer!`
    );

    // Set timeout for answer
    const timeout = setTimeout(() => {
      this.activeTrivia.delete(channel);
      this.client.say(channel, `⏰ Time's up! The answer was: ${question.a}`);
    }, 30000);

    this.activeTrivia.set(channel, { question, timeout });
  }

  async checkAnswer(channel: string, userstate: tmi.ChatUserstate, message: string) {
    const active = this.activeTrivia.get(channel);
    if (!active) return false;

    const { question, timeout } = active;
    const answer = message.toLowerCase().trim();

    if (answer === question.a || answer.includes(question.a)) {
      clearTimeout(timeout);
      this.activeTrivia.delete(channel);

      // Award points
      const pointsKey = `twitch:user:${userstate.username}:points`;
      await this.redis.incrBy(pointsKey, question.points);

      await this.client.say(
        channel,
        `✅ @${userstate.username} got it right! The answer is ${question.a} (+${question.points} points) 🎉`
      );

      return true;
    }

    return false;
  }
}
