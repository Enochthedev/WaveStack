import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const StartBody = z.object({
  platform: z.string().min(1),
  title: z.string().optional(),
  game: z.string().optional(),
  streamKey: z.string().optional(),
  platformsRelayed: z.array(z.string()).default([]),
});

const EndBody = z.object({
  vodUrl: z.string().url().optional(),
  peakViewers: z.number().int().min(0).optional(),
});

const EventBody = z.object({
  eventType: z.string().min(1).max(50),
  timestamp: z.string().datetime(),
  data: z
    .record(z.unknown())
    .default({})
    .refine((obj) => JSON.stringify(obj).length < 10_000, "Event data must be under 10KB"),
});

export default async function streamRoutes(app: FastifyInstance) {
  // GET /api/v1/streams — list stream sessions for org
  app.get("/v1/streams", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [sessions, total] = await prisma.$transaction([
      prisma.streamSession.findMany({
        where: { orgId },
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.streamSession.count({ where: { orgId } }),
    ]);
    return paginate(sessions, total, q.limit, q.offset);
  });

  // GET /api/v1/streams/live — active streams
  app.get("/v1/streams/live", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    return prisma.streamSession.findMany({
      where: { orgId, status: "live" },
      take: 50,
      orderBy: { startedAt: "desc" },
    });
  });

  // POST /api/v1/streams/start — begin a stream session
  app.post("/v1/streams/start", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const data = StartBody.parse(req.body);
    const session = await prisma.streamSession.create({
      data: { orgId, ...data, status: "live", startedAt: new Date() },
    });
    reply.code(201);
    return session;
  });

  // POST /api/v1/streams/:id/end — end a stream session
  app.post<{ Params: { id: string } }>("/v1/streams/:id/end", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const session = await prisma.streamSession.findUnique({ where: { id: req.params.id, orgId } });
    if (!session) return sendError(reply, "NOT_FOUND", "Stream session not found");

    const data = EndBody.parse(req.body);
    return prisma.streamSession.update({
      where: { id: req.params.id },
      data: { ...data, status: "ended", endedAt: new Date() },
    });
  });

  // GET /api/v1/streams/:id — get stream session details + events
  app.get<{ Params: { id: string } }>("/v1/streams/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const session = await prisma.streamSession.findUnique({
      where: { id: req.params.id, orgId },
      include: { events: { orderBy: { timestamp: "asc" }, take: 500 } },
    });
    if (!session) return sendError(reply, "NOT_FOUND", "Stream session not found");
    return session;
  });

  // POST /api/v1/streams/:id/events — ingest a stream event (from desktop app or stream-engine)
  app.post<{ Params: { id: string } }>("/v1/streams/:id/events", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const session = await prisma.streamSession.findUnique({ where: { id: req.params.id, orgId } });
    if (!session) return sendError(reply, "NOT_FOUND", "Stream session not found");

    const body = EventBody.parse(req.body);
    const event = await prisma.streamEvent.create({
      data: {
        streamSessionId: req.params.id,
        eventType: body.eventType,
        timestamp: new Date(body.timestamp),
        data: body.data,
      },
    });
    reply.code(201);
    return event;
  });
}
