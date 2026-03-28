import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";
import { sanitizeText } from "@shared/sanitize";

const ActionBody = z.object({
  action: z.enum(["timeout", "ban", "delete", "warn", "dismiss", "false_positive"]),
  reason: z.string().max(500).optional(),
});

const RuleBody = z.object({
  name: z.string().min(1),
  type: z.string(),
  pattern: z.string().optional(),
  action: z.string(),
  timeoutDuration: z.number().int().positive().optional(),
  isEnabled: z.boolean().default(true),
});

export default async function routes(app: FastifyInstance) {
  // GET /v1/moderation/flagged
  app.get("/v1/moderation/flagged", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const query = req.query as any;
    const status = query.status as string | undefined;
    const platform = query.platform as string | undefined;

    const where: any = { orgId };
    if (status) where.status = status;
    if (platform) where.platform = platform;

    const [items, total] = await prisma.$transaction([
      prisma.flaggedMessage.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.flaggedMessage.count({ where }),
    ]);

    return paginate(items, total, q.limit, q.offset);
  });

  // POST /v1/moderation/flagged/:id/action
  app.post<{ Params: { id: string } }>("/v1/moderation/flagged/:id/action", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const msg = await prisma.flaggedMessage.findUnique({ where: { id: req.params.id, orgId } });
    if (!msg) return sendError(reply, "NOT_FOUND", "Flagged message not found");

    const { action } = ActionBody.parse(req.body);

    const status =
      action === "dismiss"
        ? "dismissed"
        : action === "false_positive"
          ? "false_positive"
          : "actioned";

    const updated = await prisma.flaggedMessage.update({
      where: { id: req.params.id },
      data: {
        status,
        actionTaken: ["timeout", "ban", "delete", "warn"].includes(action) ? action : null,
        reviewedAt: new Date(),
      },
    });

    return updated;
  });

  // GET /v1/moderation/rules
  app.get("/v1/moderation/rules", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [items, total] = await prisma.$transaction([
      prisma.moderationRule.findMany({
        where: { orgId },
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "asc" },
      }),
      prisma.moderationRule.count({ where: { orgId } }),
    ]);
    return paginate(items, total, q.limit, q.offset);
  });

  // POST /v1/moderation/rules
  app.post("/v1/moderation/rules", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const raw = RuleBody.parse(req.body);
    const data = {
      ...raw,
      name: sanitizeText(raw.name, 200),
      pattern: raw.pattern ? sanitizeText(raw.pattern, 500) : undefined,
    };
    const rule = await prisma.moderationRule.create({ data: { orgId, ...data } });
    reply.code(201);
    return rule;
  });

  // PATCH /v1/moderation/rules/:id
  app.patch<{ Params: { id: string } }>("/v1/moderation/rules/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const rule = await prisma.moderationRule.findUnique({ where: { id: req.params.id, orgId } });
    if (!rule) return sendError(reply, "NOT_FOUND", "Rule not found");

    const patch = RuleBody.partial().parse(req.body);
    return prisma.moderationRule.update({ where: { id: req.params.id }, data: patch });
  });

  // DELETE /v1/moderation/rules/:id
  app.delete<{ Params: { id: string } }>("/v1/moderation/rules/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const rule = await prisma.moderationRule.findUnique({ where: { id: req.params.id, orgId } });
    if (!rule) return sendError(reply, "NOT_FOUND", "Rule not found");

    await prisma.moderationRule.delete({ where: { id: req.params.id } });
    reply.code(204);
  });

  // GET /v1/moderation/banned
  app.get("/v1/moderation/banned", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [items, total] = await prisma.$transaction([
      prisma.bannedUser.findMany({
        where: { orgId },
        take: q.limit,
        skip: q.offset,
        orderBy: { bannedAt: "desc" },
      }),
      prisma.bannedUser.count({ where: { orgId } }),
    ]);
    return paginate(items, total, q.limit, q.offset);
  });

  // DELETE /v1/moderation/banned/:userId
  app.delete<{ Params: { userId: string } }>(
    "/v1/moderation/banned/:userId",
    async (req, reply) => {
      const orgId = req.headers["x-org-id"] as string;
      if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

      const { platform } = req.body as { platform?: string };
      const where: any = { orgId, platformUserId: req.params.userId };
      if (platform) where.platform = platform;

      await prisma.bannedUser.deleteMany({ where });
      reply.code(204);
    },
  );

  // GET /v1/moderation/stats
  app.get("/v1/moderation/stats", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [flaggedToday, autoActioned, pendingReview, falsePositives, totalActioned] =
      await prisma.$transaction([
        prisma.flaggedMessage.count({ where: { orgId, createdAt: { gte: today } } }),
        prisma.flaggedMessage.count({ where: { orgId, status: "actioned" } }),
        prisma.flaggedMessage.count({ where: { orgId, status: "pending" } }),
        prisma.flaggedMessage.count({ where: { orgId, status: "false_positive" } }),
        prisma.flaggedMessage.count({
          where: { orgId, status: { in: ["actioned", "dismissed", "false_positive"] } },
        }),
      ]);

    const falsePositiveRate = totalActioned > 0 ? falsePositives / totalActioned : 0;

    return {
      flaggedToday,
      autoActioned,
      pendingReview,
      falsePositiveRate: Number(falsePositiveRate.toFixed(4)),
    };
  });
}
