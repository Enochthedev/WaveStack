import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@shared/db";
import { env } from "@config/env";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const SE_URL = env.STREAM_ENGINE_URL;

async function proxyToStreamEngine(
  method: string,
  path: string,
  headers: Record<string, string | undefined>,
  body?: unknown,
) {
  const res = await fetch(`${SE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-internal-service": env.INTERNAL_SERVICE_SECRET,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  return { status: res.status, data };
}

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
    .record(z.string(), z.unknown())
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
        data: body.data as Prisma.InputJsonValue,
      },
    });
    reply.code(201);
    return event;
  });

  // ── Rebroadcast relay (proxied to stream-engine) ────────────────────────────

  const RebroadcastStartBody = z.object({
    sourceUrl: z.string().min(1),
    platforms: z
      .array(
        z.object({
          platform: z.string().min(1),
          streamKey: z.string().min(1),
        }),
      )
      .min(1),
  });

  // POST /api/v1/streams/relay/start — start multistream rebroadcast
  app.post("/v1/streams/relay/start", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const body = RebroadcastStartBody.parse(req.body);
    const { status, data } = await proxyToStreamEngine(
      "POST",
      "/v1/relay/start",
      req.headers as Record<string, string | undefined>,
      {
        org_id: orgId,
        source_url: body.sourceUrl,
        targets: body.platforms.map((p) => ({
          platform: p.platform,
          stream_key: p.streamKey,
        })),
      },
    );
    return reply.status(status).send(data);
  });

  // POST /api/v1/streams/relay/stop — stop all rebroadcast for org
  app.post("/v1/streams/relay/stop", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { status, data } = await proxyToStreamEngine(
      "POST",
      "/v1/relay/stop",
      req.headers as Record<string, string | undefined>,
      { org_id: orgId },
    );
    return reply.status(status).send(data);
  });

  // POST /api/v1/streams/relay/stop-target — stop a single platform
  app.post("/v1/streams/relay/stop-target", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const body = z.object({ platform: z.string().min(1) }).parse(req.body);
    const { status, data } = await proxyToStreamEngine(
      "POST",
      "/v1/relay/stop-target",
      req.headers as Record<string, string | undefined>,
      { org_id: orgId, platform: body.platform },
    );
    return reply.status(status).send(data);
  });

  // GET /api/v1/streams/relay/status — get rebroadcast status for org
  app.get("/v1/streams/relay/status", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { status, data } = await proxyToStreamEngine(
      "GET",
      `/v1/relay/status/${orgId}`,
      req.headers as Record<string, string | undefined>,
    );
    return reply.status(status).send(data);
  });
}
