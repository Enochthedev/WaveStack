/**
 * Message Create Event
 * Handles message economy and moderation
 */
import { Events, Message } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message, redis: RedisClientType, logger: Logger) {
    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    // Award points for messages
    try {
      const pointsKey = `user:${message.author.id}:points`;
      const lastMessageKey = `user:${message.author.id}:last_message`;

      const lastMessage = await redis.get(lastMessageKey);
      const now = Date.now();

      // Only award points if last message was more than 60 seconds ago
      if (!lastMessage || now - parseInt(lastMessage) > 60000) {
        const pointsPerMessage = parseInt(process.env.POINTS_PER_MESSAGE || '1');
        await redis.incrBy(pointsKey, pointsPerMessage);
        await redis.set(lastMessageKey, now.toString());

        logger.debug({
          userId: message.author.id,
          points: pointsPerMessage,
        }, 'Awarded message points');
      }
    } catch (error) {
      logger.error({ err: error }, 'Error awarding message points');
    }
  },
};
