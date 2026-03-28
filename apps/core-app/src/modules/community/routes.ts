import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";
import { sanitizeText } from "@shared/sanitize";

const MilestoneBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  platform: z.string().optional(),
  targetValue: z.number().int().positive(),
  currentValue: z.number().int().min(0).default(0),
  metricType: z.string(),
});

export default async function routes(app: FastifyInstance) {
  // GET /v1/community/members
  app.get("/v1/community/members", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const query = req.query as any;
    const tier = query.tier as string | undefined;
    const platform = query.platform as string | undefined;

    const where: any = { orgId };
    if (tier) where.tier = tier;
    if (platform) where.platform = platform;

    const [members, total] = await prisma.$transaction([
      prisma.communityMember.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { lastSeenAt: "desc" },
      }),
      prisma.communityMember.count({ where }),
    ]);

    return paginate(members, total, q.limit, q.offset);
  });

  // GET /v1/community/members/:id
  app.get<{ Params: { id: string } }>("/v1/community/members/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const member = await prisma.communityMember.findUnique({
      where: { id: req.params.id, orgId },
      include: {
        chatLogs: { take: 20, orderBy: { timestamp: "desc" } },
      },
    });
    if (!member) return sendError(reply, "NOT_FOUND", "Member not found");
    return member;
  });

  // GET /v1/community/chat-logs
  app.get("/v1/community/chat-logs", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const query = req.query as any;
    const search = query.search as string | undefined;
    const platform = query.platform as string | undefined;
    const streamId = query.streamId as string | undefined;

    const where: any = { orgId };
    if (platform) where.platform = platform;
    if (streamId) where.streamSessionId = streamId;
    if (search) where.content = { contains: search, mode: "insensitive" };

    const [logs, total] = await prisma.$transaction([
      prisma.chatLogEntry.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { timestamp: "desc" },
      }),
      prisma.chatLogEntry.count({ where }),
    ]);

    return paginate(logs, total, q.limit, q.offset);
  });

  // GET /v1/community/milestones
  app.get("/v1/community/milestones", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [items, total] = await prisma.$transaction([
      prisma.milestone.findMany({
        where: { orgId },
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.milestone.count({ where: { orgId } }),
    ]);
    return paginate(items, total, q.limit, q.offset);
  });

  // POST /v1/community/milestones (upsert by title + platform)
  app.post("/v1/community/milestones", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const raw = MilestoneBody.parse(req.body);
    const data = {
      ...raw,
      title: sanitizeText(raw.title, 200),
      description: raw.description ? sanitizeText(raw.description, 2000) : undefined,
    };
    const reachedAt = data.currentValue >= data.targetValue ? new Date() : null;

    const milestone = await prisma.milestone.create({
      data: { orgId, ...data, reachedAt },
    });
    reply.code(201);
    return milestone;
  });
}
