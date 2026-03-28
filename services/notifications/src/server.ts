/**
 * Notifications Service — port 4000
 *
 * Responsibilities:
 *  - Expo push notifications to mobile app
 *  - Telegram alerts
 *  - Stores device tokens per org/user in Redis
 *  - Listens on Redis pub/sub for notification events from other services
 */
import Fastify from "fastify";
import Redis from "ioredis";
import { z } from "zod";
import { config } from "./config";
import { sendExpoPush } from "./channels/expo";
import { sendTelegramMessage } from "./channels/telegram";

const app = Fastify({ logger: { level: "info" } });

const redis = new Redis(config.REDIS_URL);
const subscriber = new Redis(config.REDIS_URL);

// ── Token registration ────────────────────────────────────────────────────────

const RegisterTokenBody = z.object({
  orgId: z.string(),
  userId: z.string(),
  expoPushToken: z.string().startsWith("ExponentPushToken["),
  telegramChatId: z.string().optional(),
});

app.post("/v1/notifications/register", async (req, reply) => {
  const isInternal = req.headers["x-internal-service"] === config.INTERNAL_SERVICE_SECRET;
  if (!isInternal) return reply.code(403).send({ error: "Forbidden" });

  const body = RegisterTokenBody.parse(req.body);
  const key = `device_tokens:${body.orgId}:${body.userId}`;

  await redis.sadd(key, body.expoPushToken);
  await redis.expire(key, 90 * 86_400); // 90 days TTL

  if (body.telegramChatId) {
    await redis.set(`telegram_chat:${body.orgId}:${body.userId}`, body.telegramChatId, "EX", 90 * 86_400);
  }

  return { ok: true };
});

// ── Push notification endpoint ────────────────────────────────────────────────

const SendBody = z.object({
  orgId: z.string(),
  userId: z.string().optional(),  // null = all users in org
  title: z.string(),
  body: z.string(),
  data: z.record(z.unknown()).optional(),
  channels: z.array(z.enum(["push", "telegram"])).default(["push"]),
});

app.post("/v1/notifications/send", async (req, reply) => {
  const isInternal = req.headers["x-internal-service"] === config.INTERNAL_SERVICE_SECRET;
  if (!isInternal) return reply.code(403).send({ error: "Forbidden" });

  const { orgId, userId, title, body: bodyText, data, channels } = SendBody.parse(req.body);

  const results: Record<string, unknown> = {};

  if (channels.includes("push")) {
    const pattern = userId
      ? `device_tokens:${orgId}:${userId}`
      : `device_tokens:${orgId}:*`;

    const keys = userId
      ? [pattern]
      : await redis.keys(pattern);

    const allTokens: string[] = [];
    for (const key of keys) {
      const tokens = await redis.smembers(key);
      allTokens.push(...tokens);
    }

    if (allTokens.length > 0) {
      const tickets = await sendExpoPush(allTokens, title, bodyText, data, config.EXPO_ACCESS_TOKEN);
      results.push = { sent: tickets.length, tickets };
    }
  }

  if (channels.includes("telegram") && config.TELEGRAM_BOT_TOKEN) {
    const chatPattern = userId
      ? [`telegram_chat:${orgId}:${userId}`]
      : await redis.keys(`telegram_chat:${orgId}:*`);

    for (const key of chatPattern) {
      const chatId = await redis.get(key);
      if (chatId) {
        await sendTelegramMessage(
          config.TELEGRAM_BOT_TOKEN,
          chatId,
          `<b>${title}</b>\n${bodyText}`,
        );
      }
    }
    results.telegram = { sent: chatPattern.length };
  }

  return { ok: true, results };
});

// ── Device token removal ──────────────────────────────────────────────────────

app.delete("/v1/notifications/register", async (req, reply) => {
  const isInternal = req.headers["x-internal-service"] === config.INTERNAL_SERVICE_SECRET;
  if (!isInternal) return reply.code(403).send({ error: "Forbidden" });

  const { orgId, userId, expoPushToken } = req.body as { orgId: string; userId: string; expoPushToken: string };
  if (expoPushToken) {
    await redis.srem(`device_tokens:${orgId}:${userId}`, expoPushToken);
  }
  reply.code(204);
});

// ── Health ────────────────────────────────────────────────────────────────────

app.get("/health", async () => ({ status: "ok" }));

// ── Redis subscriber — listen for notification events from other services ─────

async function startSubscriber() {
  await subscriber.subscribe("notifications:send");

  subscriber.on("message", async (_channel: string, message: string) => {
    try {
      const payload = JSON.parse(message) as {
        orgId: string;
        userId?: string;
        title: string;
        body: string;
        data?: Record<string, unknown>;
        channels?: ("push" | "telegram")[];
      };

      // Re-use the send logic by constructing a fake request
      const keys = payload.userId
        ? [`device_tokens:${payload.orgId}:${payload.userId}`]
        : await redis.keys(`device_tokens:${payload.orgId}:*`);

      const allTokens: string[] = [];
      for (const key of keys) {
        allTokens.push(...await redis.smembers(key));
      }

      if (allTokens.length > 0) {
        await sendExpoPush(allTokens, payload.title, payload.body, payload.data, config.EXPO_ACCESS_TOKEN);
      }
    } catch (err) {
      app.log.error({ err }, "Failed to process notification event");
    }
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen({ port: config.PORT, host: "0.0.0.0" }).then(() => {
  startSubscriber().catch((err) => app.log.error({ err }, "Subscriber error"));
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
