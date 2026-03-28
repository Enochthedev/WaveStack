import type { FastifyInstance } from "fastify";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";

const SUPPORTED_PLATFORMS = [
  "youtube",
  "instagram",
  "x",
  "tiktok",
  "twitter",
  "linkedin",
  "facebook",
  "kick",
  "twitch",
] as const;

export default async function routes(app: FastifyInstance) {
  // GET /v1/publisher/providers — list supported platforms + org connection status
  app.get("/v1/publisher/providers", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const credentials = await prisma.platformCredential.findMany({
      where: { orgId },
      select: { platform: true, status: true, accountHandle: true },
    });

    const connectedMap = new Map(credentials.map((c) => [c.platform, c]));

    return SUPPORTED_PLATFORMS.map((platform) => {
      const cred = connectedMap.get(platform);
      return {
        platform,
        connected: !!cred && cred.status === "active",
        handle: cred?.accountHandle ?? null,
        status: cred?.status ?? "disconnected",
      };
    });
  });

  // GET /v1/publisher/stats — recent publish stats
  app.get("/v1/publisher/stats", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [total, published, failed, queued] = await prisma.$transaction([
      prisma.queueItem.count({ where: { orgId } }),
      prisma.queueItem.count({
        where: { orgId, status: "published", publishedAt: { gte: since } },
      }),
      prisma.queueItem.count({ where: { orgId, status: "failed" } }),
      prisma.queueItem.count({ where: { orgId, status: "queued" } }),
    ]);

    const byPlatform = await prisma.$queryRawUnsafe<Array<{ platform: string; count: bigint }>>(
      `SELECT unnest(platforms) AS platform, COUNT(*) AS count
       FROM queue_items
       WHERE org_id = $1 AND status = 'published'
         AND published_at >= NOW() - INTERVAL '30 days'
       GROUP BY platform`,
      orgId,
    );

    return {
      total,
      published30d: published,
      failed,
      queued,
      byPlatform: byPlatform.map((r) => ({ platform: r.platform, count: Number(r.count) })),
    };
  });
}
