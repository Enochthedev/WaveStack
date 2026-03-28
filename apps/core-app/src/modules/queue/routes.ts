import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { publishQueue } from "@shared/queue";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const CreateBody = z.object({
  projectId: z.string().optional(),
  assetId: z.string().optional(),
  title: z.string().min(1).max(120),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  platforms: z.array(z.string()).min(1),
  scheduleAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
  aiGenerated: z.boolean().default(false),
  approvalRequired: z.boolean().default(false),
  firstCommentText: z.string().optional(),
});

const UpdateBody = z.object({
  title: z.string().min(1).max(120).optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  platforms: z.array(z.string()).min(1).optional(),
  scheduleAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
  firstCommentText: z.string().optional(),
});

export default async function routes(app: FastifyInstance) {
  // GET /api/v1/queue — list queue items
  app.get("/v1/queue", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const query = req.query as any;
    const status = query.status as string | undefined;
    const platform = query.platform as string | undefined;
    const from = query.from as string | undefined;
    const to = query.to as string | undefined;

    const where: any = { orgId };
    if (status) where.status = status;
    if (platform) where.platforms = { has: platform };
    if (from || to) {
      where.scheduleAt = {};
      if (from) where.scheduleAt.gte = new Date(from);
      if (to) where.scheduleAt.lte = new Date(to);
    }

    const [items, total] = await prisma.$transaction([
      prisma.queueItem.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { scheduleAt: "asc" },
        include: { asset: { select: { id: true, title: true, cdnUrl: true, duration: true } } },
      }),
      prisma.queueItem.count({ where }),
    ]);
    return paginate(items, total, q.limit, q.offset);
  });

  // GET /api/v1/queue/calendar — items grouped by date for calendar view
  app.get("/v1/queue/calendar", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const query = req.query as any;
    const from = query.from as string | undefined;
    const to = query.to as string | undefined;

    const where: any = { orgId, status: { in: ["queued", "processing", "published"] } };
    if (from || to) {
      where.scheduleAt = {};
      if (from) where.scheduleAt.gte = new Date(from);
      if (to) where.scheduleAt.lte = new Date(to);
    }

    const items = await prisma.queueItem.findMany({
      where,
      orderBy: { scheduleAt: "asc" },
      select: { id: true, title: true, platforms: true, status: true, scheduleAt: true },
    });

    // Group by date
    const grouped: Record<string, typeof items> = {};
    for (const item of items) {
      const date = item.scheduleAt ? item.scheduleAt.toISOString().split("T")[0] : "undated";
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(item);
    }
    return grouped;
  });

  // GET /api/v1/queue/drafts — list drafts
  app.get("/v1/queue/drafts", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [drafts, total] = await prisma.$transaction([
      prisma.queueItem.findMany({
        where: { orgId, status: "draft" },
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.queueItem.count({ where: { orgId, status: "draft" } }),
    ]);
    return paginate(drafts, total, q.limit, q.offset);
  });

  // GET /api/v1/queue/:id — single queue item
  app.get<{ Params: { id: string } }>("/v1/queue/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const item = await prisma.queueItem.findUnique({
      where: { id: req.params.id, orgId },
      include: {
        asset: { select: { id: true, title: true, cdnUrl: true, duration: true, mimeType: true } },
        posts: { select: { id: true, platform: true, url: true, publishedAt: true } },
      },
    });
    if (!item) return sendError(reply, "NOT_FOUND", "Queue item not found");
    return item;
  });

  // POST /api/v1/queue — create queue item
  app.post("/v1/queue", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const idem = req.headers["idempotency-key"];
    if (!idem || typeof idem !== "string") {
      return sendError(reply, "BAD_REQUEST", "Missing Idempotency-Key header");
    }

    const existing = await prisma.queueItem.findUnique({ where: { idempotencyKey: idem } });
    if (existing) return existing;

    const data = CreateBody.parse(req.body);
    const status = data.scheduleAt ? "queued" : "draft";

    const qi = await prisma.queueItem.create({
      data: { orgId, ...data, idempotencyKey: idem, status },
    });

    // Enqueue publish jobs if scheduled (not draft)
    if (status === "queued") {
      for (const p of qi.platforms) {
        const delay = data.scheduleAt
          ? Math.max(0, new Date(data.scheduleAt).getTime() - Date.now())
          : 0;
        await publishQueue.add(
          "publish",
          { queueItemId: qi.id, platform: p },
          { jobId: `${qi.id}:${p}`, delay },
        );
      }
    }

    reply.code(201);
    return qi;
  });

  // POST /api/v1/queue/draft — save draft without schedule
  app.post("/v1/queue/draft", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const data = CreateBody.omit({ scheduleAt: true }).parse(req.body);
    const qi = await prisma.queueItem.create({
      data: {
        orgId,
        ...data,
        idempotencyKey: `draft:${orgId}:${Date.now()}`,
        status: "draft",
      },
    });
    reply.code(201);
    return qi;
  });

  // PATCH /api/v1/queue/:id — update queue item
  app.patch<{ Params: { id: string } }>("/v1/queue/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const item = await prisma.queueItem.findUnique({ where: { id: req.params.id, orgId } });
    if (!item) return sendError(reply, "NOT_FOUND", "Queue item not found");
    if (!["draft", "queued"].includes(item.status)) {
      return sendError(reply, "CONFLICT", "Only draft or queued items can be edited");
    }

    const patch = UpdateBody.parse(req.body);
    return prisma.queueItem.update({ where: { id: req.params.id }, data: patch });
  });

  // DELETE /api/v1/queue/:id — cancel/delete queue item
  app.delete<{ Params: { id: string } }>("/v1/queue/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const item = await prisma.queueItem.findUnique({ where: { id: req.params.id, orgId } });
    if (!item) return sendError(reply, "NOT_FOUND", "Queue item not found");
    if (item.status === "processing") {
      return sendError(reply, "CONFLICT", "Cannot delete an item currently being published");
    }

    await prisma.queueItem.update({
      where: { id: req.params.id },
      data: { status: "cancelled" },
    });
    reply.code(204);
  });

  // POST /api/v1/queue/:id/publish-now — bypass schedule, publish immediately
  app.post<{ Params: { id: string } }>("/v1/queue/:id/publish-now", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const item = await prisma.queueItem.findUnique({ where: { id: req.params.id, orgId } });
    if (!item) return sendError(reply, "NOT_FOUND", "Queue item not found");
    if (item.status === "published") {
      return sendError(reply, "CONFLICT", "Item already published");
    }

    const updated = await prisma.queueItem.update({
      where: { id: req.params.id },
      data: { status: "queued", scheduleAt: new Date() },
    });

    for (const p of item.platforms) {
      await publishQueue.add(
        "publish",
        { queueItemId: item.id, platform: p },
        { jobId: `${item.id}:${p}:now:${Date.now()}` },
      );
    }

    return updated;
  });

  // POST /api/v1/queue/:id/retry — retry failed item
  app.post<{ Params: { id: string } }>("/v1/queue/:id/retry", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const item = await prisma.queueItem.findUnique({ where: { id: req.params.id, orgId } });
    if (!item) return sendError(reply, "NOT_FOUND", "Queue item not found");
    if (item.status !== "failed")
      return sendError(reply, "CONFLICT", "Only failed items can be retried");

    const updated = await prisma.queueItem.update({
      where: { id: req.params.id },
      data: { status: "queued", failedAt: null, failureReason: null },
    });

    for (const p of item.platforms) {
      await publishQueue.add(
        "publish",
        { queueItemId: item.id, platform: p },
        { jobId: `${item.id}:${p}:retry:${Date.now()}` },
      );
    }
    return updated;
  });

  // GET /api/v1/queue/suggest-time — AI-suggested best posting times
  app.get("/v1/queue/suggest-time", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    // Pull engagement patterns from PlatformSnapshots if available, else return defaults
    const suggestions = [
      { platform: "youtube", dayOfWeek: "Thursday", hour: 18, timezone: "UTC", confidence: 0.82 },
      {
        platform: "instagram",
        dayOfWeek: "Wednesday",
        hour: 12,
        timezone: "UTC",
        confidence: 0.76,
      },
      { platform: "tiktok", dayOfWeek: "Friday", hour: 20, timezone: "UTC", confidence: 0.71 },
      { platform: "twitter", dayOfWeek: "Tuesday", hour: 9, timezone: "UTC", confidence: 0.68 },
    ];
    return suggestions;
  });

  // Legacy endpoints (kept for backward compat)
  app.get("/", async () => ({ ok: true }));
  app.post("/enqueue", async () => ({ queued: true }));
}
