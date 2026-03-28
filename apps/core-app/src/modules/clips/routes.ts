import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { publishQueue } from "@shared/queue";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";
import { safeSortField } from "@shared/sanitize";

const ALLOWED_SORT_FIELDS = ["createdAt", "duration"] as const;

const CreateBody = z.object({
  sourceStreamId: z.string().optional(),
  sourceUrl: z.string().optional(),
  startTime: z.number().optional(),
  duration: z.number().positive(),
  title: z.string().optional(),
});

const UpdateBody = z.object({
  title: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

export default async function routes(app: FastifyInstance) {
  // GET /v1/clips
  app.get("/v1/clips", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const query = req.query as any;
    const status = query.status as string | undefined;
    const sortBy = safeSortField(
      query.sortBy as string | undefined,
      ALLOWED_SORT_FIELDS,
      "createdAt",
    );

    const where: any = { orgId };
    if (status) where.status = status;
    const orderBy: any = sortBy === "duration" ? { duration: "desc" } : { createdAt: "desc" };

    const [assets, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy,
        include: {
          performance: { take: 1, orderBy: { views: "desc" } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    const items = assets.map((a) => ({
      id: a.id,
      title: a.title,
      duration: a.duration,
      cdnUrl: a.cdnUrl,
      status: a.status,
      sourceStreamId: a.sourceStreamId,
      sourceStartSec: a.sourceStartSec,
      sourceEndSec: a.sourceEndSec,
      createdAt: a.createdAt,
      views: a.performance[0] ? Number(a.performance[0].views) : 0,
      likes: a.performance[0]?.likes ?? 0,
      platform: a.performance[0]?.platform ?? null,
    }));

    return paginate(items, total, q.limit, q.offset);
  });

  // GET /v1/clips/:id
  app.get<{ Params: { id: string } }>("/v1/clips/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id, orgId },
      include: { performance: { orderBy: { fetchedAt: "desc" } } },
    });
    if (!asset) return sendError(reply, "NOT_FOUND", "Clip not found");
    return asset;
  });

  // POST /v1/clips
  app.post("/v1/clips", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const data = CreateBody.parse(req.body);
    const asset = await prisma.asset.create({
      data: {
        orgId,
        title: data.title,
        duration: Math.round(data.duration),
        sourceStreamId: data.sourceStreamId,
        sourceStartSec: data.startTime,
        sourceEndSec: data.startTime != null ? data.startTime + data.duration : undefined,
        storagePath: data.sourceUrl,
        status: "pending",
      },
    });
    reply.code(201);
    return asset;
  });

  // PATCH /v1/clips/:id
  app.patch<{ Params: { id: string } }>("/v1/clips/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id, orgId } });
    if (!asset) return sendError(reply, "NOT_FOUND", "Clip not found");

    const patch = UpdateBody.parse(req.body);
    return prisma.asset.update({
      where: { id: req.params.id },
      data: { title: patch.title },
    });
  });

  // DELETE /v1/clips/:id
  app.delete<{ Params: { id: string } }>("/v1/clips/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id, orgId } });
    if (!asset) return sendError(reply, "NOT_FOUND", "Clip not found");

    await prisma.asset.delete({ where: { id: req.params.id } });
    reply.code(204);
  });

  // POST /v1/clips/:id/publish
  app.post<{ Params: { id: string } }>("/v1/clips/:id/publish", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id, orgId } });
    if (!asset) return sendError(reply, "NOT_FOUND", "Clip not found");
    if (asset.status !== "ready")
      return sendError(reply, "CONFLICT", "Clip not ready for publishing");

    const { platforms } = z
      .object({ platforms: z.array(z.string().min(1)).min(1) })
      .parse(req.body);

    const idem = `clip:${asset.id}:${Date.now()}`;
    const qi = await prisma.queueItem.create({
      data: {
        orgId,
        assetId: asset.id,
        title: asset.title ?? `Clip ${asset.id}`,
        platforms,
        idempotencyKey: idem,
        status: "queued",
        scheduleAt: new Date(),
      },
    });

    const queued: string[] = [];
    for (const p of platforms) {
      await publishQueue.add(
        "publish",
        { queueItemId: qi.id, platform: p },
        { jobId: `${qi.id}:${p}:clip` },
      );
      queued.push(p);
    }
    return { queued };
  });

  // GET /v1/streams/:streamId/highlights
  app.get<{ Params: { streamId: string } }>(
    "/v1/streams/:streamId/highlights",
    async (req, reply) => {
      const orgId = req.headers["x-org-id"] as string;
      if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

      const session = await prisma.streamSession.findUnique({
        where: { id: req.params.streamId, orgId },
      });
      if (!session) return sendError(reply, "NOT_FOUND", "Stream session not found");

      const events = await prisma.streamEvent.findMany({
        where: { streamSessionId: req.params.streamId, eventType: "clip_trigger" },
        orderBy: { timestamp: "asc" },
      });

      return events.map((e) => ({
        id: e.id,
        streamSessionId: e.streamSessionId,
        timestamp: e.timestamp,
        data: e.data,
      }));
    },
  );

  // POST /v1/highlights/:highlightId/approve
  app.post<{ Params: { highlightId: string } }>(
    "/v1/highlights/:highlightId/approve",
    async (req, reply) => {
      const orgId = req.headers["x-org-id"] as string;
      if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

      const event = await prisma.streamEvent.findUnique({ where: { id: req.params.highlightId } });
      if (!event) return sendError(reply, "NOT_FOUND", "Highlight not found");

      const session = await prisma.streamSession.findUnique({
        where: { id: event.streamSessionId, orgId },
      });
      if (!session) return sendError(reply, "FORBIDDEN", "Not your stream");

      const data = event.data as any;
      const startSec = data?.startSec ?? 0;
      const duration = data?.duration ?? 60;

      const asset = await prisma.asset.create({
        data: {
          orgId,
          sourceStreamId: event.streamSessionId,
          sourceStartSec: startSec,
          sourceEndSec: startSec + duration,
          duration,
          title: `Highlight from ${session.title ?? session.id}`,
          status: "pending",
        },
      });
      reply.code(201);
      return asset;
    },
  );
}
