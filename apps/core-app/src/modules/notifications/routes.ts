/**
 * Notifications module — Server-Sent Events (SSE) for real-time push to web/mobile clients.
 * Internal services publish events via Redis pub/sub; this module fans them out to connected clients.
 *
 * Channels:
 *   org:{orgId}:notifications — general notifications for the org
 *   org:{orgId}:approvals     — approval requests needing review
 *   org:{orgId}:stream        — live stream events
 */
import type { FastifyInstance } from "fastify";
import Redis from "ioredis";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

type SSEClient = { orgId: string; reply: any };
const clients = new Map<string, Set<SSEClient>>();

let subscriber: Redis | null = null;

function getSubscriber(): Redis {
  if (subscriber) return subscriber;
  subscriber = new Redis(process.env.REDIS_URL ?? "redis://redis:6379", { lazyConnect: false });
  return subscriber;
}

function registerClient(orgId: string, client: SSEClient) {
  if (!clients.has(orgId)) clients.set(orgId, new Set());
  clients.get(orgId)!.add(client);
}

function unregisterClient(orgId: string, client: SSEClient) {
  const orgClients = clients.get(orgId);
  if (orgClients) {
    orgClients.delete(client);
    if (orgClients.size === 0) clients.delete(orgId);
  }
}

function sendSSE(client: SSEClient, event: string, data: unknown) {
  try {
    client.reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Client disconnected
  }
}

// Shared publisher — one connection, reused across calls
let publisher: Redis | null = null;
function getPublisher(): Redis {
  if (!publisher) publisher = new Redis(process.env.REDIS_URL ?? "redis://redis:6379");
  return publisher;
}

export async function publishNotification(orgId: string, event: string, data: unknown) {
  await getPublisher().publish(`org:${orgId}:notifications`, JSON.stringify({ event, data }));
}

export default async function notificationsRoutes(app: FastifyInstance) {
  // Subscribe to Redis channels on startup
  app.addHook("onReady", async () => {
    const sub = getSubscriber();
    await sub.psubscribe("org:*:notifications");
    sub.on("pmessage", (_pattern: string, channel: string, message: string) => {
      const orgId = channel.split(":")[1];
      const orgClients = clients.get(orgId);
      if (!orgClients || orgClients.size === 0) return;
      try {
        const { event, data } = JSON.parse(message) as { event: string; data: unknown };
        for (const client of orgClients) {
          sendSSE(client, event, data);
        }
      } catch {
        // Malformed message
      }
    });
  });

  // GET /api/v1/notifications/stream — SSE endpoint
  app.get("/v1/notifications/stream", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    // Set SSE headers
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders();

    const client: SSEClient = { orgId, reply };
    registerClient(orgId, client);

    // Send initial ping to confirm connection
    reply.raw.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

    // Heartbeat every 25s to keep connection alive through proxies
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`:heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 25_000);

    req.raw.on("close", () => {
      clearInterval(heartbeat);
      unregisterClient(orgId, client);
    });

    // Keep the handler alive — SSE is long-lived
    await new Promise<void>((resolve) => req.raw.on("close", resolve));
  });

  // POST /api/v1/notifications/broadcast — internal endpoint to push a notification
  app.post("/v1/notifications/broadcast", async (req, reply) => {
    const isInternal = req.headers["x-internal-service"] === process.env.INTERNAL_SERVICE_SECRET;
    if (!isInternal) return sendError(reply, "FORBIDDEN", "Internal use only");

    const { orgId, event, data } = req.body as { orgId: string; event: string; data: unknown };
    if (!orgId || !event) return sendError(reply, "BAD_REQUEST", "orgId and event required");

    await publishNotification(orgId, event, data);
    return { ok: true };
  });

  // GET /v1/notifications — list persistent notifications
  app.get("/v1/notifications", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const unreadOnly = (req.query as any).unreadOnly === "true";

    const where: any = { orgId };
    if (unreadOnly) where.isRead = false;

    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
    ]);

    return paginate(items, total, q.limit, q.offset);
  });

  // POST /v1/notifications/read — mark specific IDs read
  app.post("/v1/notifications/read", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0)
      return sendError(reply, "BAD_REQUEST", "ids required");

    await prisma.notification.updateMany({
      where: { orgId, id: { in: ids } },
      data: { isRead: true, readAt: new Date() },
    });

    reply.code(204);
  });

  // POST /v1/notifications/read-all — mark all read
  app.post("/v1/notifications/read-all", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    await prisma.notification.updateMany({
      where: { orgId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    reply.code(204);
  });

  // GET /v1/notifications/prefs — get notification preferences
  app.get("/v1/notifications/prefs", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) return sendError(reply, "UNAUTHORIZED", "Missing user context");

    return prisma.notificationPref.findMany({ where: { orgId, userId } });
  });

  // PUT /v1/notifications/prefs — upsert notification preferences
  app.put("/v1/notifications/prefs", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) return sendError(reply, "UNAUTHORIZED", "Missing user context");

    const { prefs } = req.body as {
      prefs: Array<{ type: string; inApp: boolean; email: boolean }>;
    };
    if (!Array.isArray(prefs)) return sendError(reply, "BAD_REQUEST", "prefs array required");

    const results = await prisma.$transaction(
      prefs.map((p) =>
        prisma.notificationPref.upsert({
          where: { orgId_userId_type: { orgId, userId, type: p.type } },
          update: { inApp: p.inApp, email: p.email },
          create: { orgId, userId, type: p.type, inApp: p.inApp, email: p.email },
        }),
      ),
    );

    return results;
  });
}
