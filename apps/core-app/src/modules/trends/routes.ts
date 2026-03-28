import type { FastifyInstance } from "fastify";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";

export default async function routes(app: FastifyInstance) {
  // GET /v1/trends — trending topics based on community activity + stream events
  app.get("/v1/trends", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Pull recent stream events for spike/chat patterns
    const recentEvents = await prisma.streamEvent.findMany({
      where: {
        streamSession: { orgId },
        timestamp: { gte: since },
        eventType: { in: ["chat_spike", "viewer_delta", "clip_trigger"] },
      },
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    // Frequency count by eventType as a proxy for trending activity
    const eventCounts = new Map<string, number>();
    for (const e of recentEvents) {
      eventCounts.set(e.eventType, (eventCounts.get(e.eventType) ?? 0) + 1);
    }

    // Recent top-performing content
    const topContent = await prisma.contentPerformance.findMany({
      where: { orgId, fetchedAt: { gte: since } },
      orderBy: { views: "desc" },
      take: 5,
      include: { asset: { select: { title: true } } },
    });

    const topics = topContent.map((c) => ({
      topic: c.asset?.title ?? `${c.platform} content`,
      platform: c.platform,
      views: Number(c.views),
      engagement: c.likes + c.comments + c.shares,
    }));

    return {
      topics,
      activitySummary: Object.fromEntries(eventCounts),
      period: "7d",
    };
  });
}
