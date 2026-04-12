/**
 * Tool usage analytics routes.
 */
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";
import { requireOrg, getOrgId } from "../shared/middleware";

const UsageQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  serverId: z.string().optional(),
  toolName: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export default async function analyticsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOrg);

  // GET /api/v1/analytics/usage — usage statistics
  app.get("/usage", async (req) => {
    const orgId = getOrgId(req);
    const q = UsageQuery.parse(req.query);

    const where: any = { tool: { server: { orgId } } };
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = q.from;
      if (q.to) where.createdAt.lte = q.to;
    }
    if (q.serverId) where.tool = { ...where.tool, serverId: q.serverId };
    if (q.toolName) where.tool = { ...where.tool, name: q.toolName };

    // Summary stats
    const [totalCalls, successCalls, cachedCalls, recentUsage] = await db.$transaction([
      db.mcpToolUsage.count({ where }),
      db.mcpToolUsage.count({ where: { ...where, status: "success" } }),
      db.mcpToolUsage.count({ where: { ...where, cached: true } }),
      db.mcpToolUsage.findMany({
        where,
        take: q.limit,
        orderBy: { createdAt: "desc" },
        include: {
          tool: { select: { name: true, server: { select: { name: true } } } },
        },
      }),
    ]);

    const successRate = totalCalls > 0 ? (successCalls / totalCalls) * 100 : 0;
    const cacheHitRate = totalCalls > 0 ? (cachedCalls / totalCalls) * 100 : 0;

    return {
      summary: {
        totalCalls,
        successCalls,
        cachedCalls,
        successRate: Number(successRate.toFixed(1)),
        cacheHitRate: Number(cacheHitRate.toFixed(1)),
      },
      recent: recentUsage.map((u) => ({
        id: u.id,
        toolName: u.tool.name,
        serverName: u.tool.server.name,
        callerId: u.callerId,
        callerType: u.callerType,
        status: u.status,
        cached: u.cached,
        durationMs: u.durationMs,
        createdAt: u.createdAt,
      })),
    };
  });
}
