/**
 * Message Create Event
 * Handles message economy, moderation, and RAG knowledge queries.
 */
import { Events, Message, GuildMember } from 'discord.js';
import { RedisClientType } from 'redis';
import { Logger } from 'pino';
import { KnowledgeService } from '../services/knowledge';

// Module-level singleton created on first message (logger is stable per-process).
let _knowledgeService: KnowledgeService | null = null;
function getKnowledgeService(logger: Logger): KnowledgeService {
  return (_knowledgeService ??= new KnowledgeService(logger));
}

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message, redis: RedisClientType, logger: Logger) {
    // Ignore bots
    if (message.author.bot) return;

    // Ignore DMs
    if (!message.guild) return;

    // ── RAG knowledge query (highest priority — answer before moderation) ──
    if (KnowledgeService.isKnowledgeQuery(message.content)) {
      const question = KnowledgeService.extractQuery(message.content);
      if (question.length > 0) {
        try {
          const ks = getKnowledgeService(logger);
          const answer = await ks.query(question);
          if (answer) {
            await message.reply(KnowledgeService.formatReply(answer, question));
          } else {
            await message.reply("I couldn't find an answer to that. Try rephrasing your question.");
          }
        } catch (err) {
          logger.error({ err }, '[knowledge] failed to reply');
        }
        return; // Don't process further
      }
    }

    // AI-powered auto-moderation (if enabled)
    if (process.env.USE_AI_MODERATION === 'true') {
      try {
        const member = message.member as GuildMember;
        const userRoles = member?.roles.cache.map(r => r.name) || [];

        const moderationResponse = await fetch(`${process.env.AUTO_MOD_URL || 'http://auto-mod:8700'}/api/v1/moderate/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.content,
            user_id: message.author.id,
            username: message.author.username,
            platform: 'discord',
            channel_id: message.channelId,
            user_roles: userRoles,
          }),
        });

        if (moderationResponse.ok) {
          const modResult = await moderationResponse.json();

          // Handle moderation actions
          if (modResult.should_delete) {
            await message.delete();
            logger.info({
              userId: message.author.id,
              violations: modResult.violations,
            }, 'Message deleted by AI moderation');
          }

          if (modResult.should_timeout && member) {
            const duration = modResult.timeout_duration * 1000; // Convert to ms
            await member.timeout(duration, modResult.reason || 'Auto-moderation');
            await message.channel.send(`⚠️ ${message.author} has been timed out for ${modResult.timeout_duration}s. Reason: ${modResult.reason}`);

            logger.info({
              userId: message.author.id,
              duration: modResult.timeout_duration,
              reason: modResult.reason,
            }, 'User timed out by AI moderation');
          }

          if (modResult.should_ban && member) {
            await member.ban({ reason: modResult.reason || 'Auto-moderation - multiple violations' });
            await message.channel.send(`🔨 ${message.author.username} has been banned. Reason: ${modResult.reason}`);

            logger.warn({
              userId: message.author.id,
              reason: modResult.reason,
            }, 'User banned by AI moderation');
          }

          // If message was moderated, don't award points
          if (modResult.should_delete || modResult.should_timeout || modResult.should_ban) {
            return;
          }
        }
      } catch (error) {
        logger.error({ err: error }, 'Error in AI moderation check');
        // Continue to award points even if moderation fails
      }
    }

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
