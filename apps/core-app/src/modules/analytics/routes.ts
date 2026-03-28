import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const PERIODS = ["7d", "30d", "90d", "1y"] as const;
const PeriodQuery = z.object({ period: z.enum(PERIODS).default("30d") });

const REVENUE_PERIODS = ["3m", "6m", "12m"] as const;
const RevenuePeriodQuery = z.object({ period: z.enum(REVENUE_PERIODS).default("12m") });

function periodToDate(period: string): Date {
  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export default async function routes(app: FastifyInstance) {
  // GET /v1/analytics/overview?period=7d|30d|90d|1y
  app.get("/v1/analytics/overview", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { period } = PeriodQuery.parse(req.query);
    const since = periodToDate(period);

    const snapshots = await prisma.platformSnapshot.findMany({
      where: { orgId, snapshottedAt: { gte: since } },
      orderBy: { snapshottedAt: "asc" },
    });

    // Aggregate per-platform (latest snapshot per platform)
    const platformMap = new Map<string, (typeof snapshots)[0]>();
    for (const s of snapshots) {
      const existing = platformMap.get(s.platform);
      if (!existing || s.snapshottedAt > existing.snapshottedAt) {
        platformMap.set(s.platform, s);
      }
    }

    const platforms = Array.from(platformMap.values()).map((s) => ({
      platform: s.platform,
      followers: Number(s.followers),
      views: Number(s.views),
      engagementRate: Number(s.engagementRate),
      revenueCents: Number(s.revenueCents),
    }));

    // Daily rollup: sum across platforms grouped by date
    const dailyMap = new Map<string, { views: number; followers: number; revenue: number }>();
    for (const s of snapshots) {
      const date = s.snapshottedAt.toISOString().split("T")[0];
      const existing = dailyMap.get(date) ?? { views: 0, followers: 0, revenue: 0 };
      dailyMap.set(date, {
        views: existing.views + Number(s.views),
        followers: existing.followers + Number(s.followers),
        revenue: existing.revenue + Number(s.revenueCents),
      });
    }

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, metrics]) => ({ date, ...metrics }));

    return { platforms, daily };
  });

  // GET /v1/analytics/streams — stream analytics list
  app.get("/v1/analytics/streams", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [sessions, total] = await prisma.$transaction([
      prisma.streamSession.findMany({
        where: { orgId, status: "ended" },
        take: q.limit,
        skip: q.offset,
        orderBy: { startedAt: "desc" },
        include: { events: { select: { eventType: true, timestamp: true } } },
      }),
      prisma.streamSession.count({ where: { orgId, status: "ended" } }),
    ]);

    const items = sessions.map((s) => ({
      id: s.id,
      platform: s.platform,
      title: s.title,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationMinutes:
        s.startedAt && s.endedAt
          ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60_000)
          : null,
      peakViewers: s.peakViewers,
      eventCount: s.events.length,
    }));

    return paginate(items, total, q.limit, q.offset);
  });

  // GET /v1/analytics/streams/:id — stream detail
  app.get<{ Params: { id: string } }>("/v1/analytics/streams/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const session = await prisma.streamSession.findUnique({
      where: { id: req.params.id, orgId },
      include: { events: { orderBy: { timestamp: "asc" } } },
    });
    if (!session) return sendError(reply, "NOT_FOUND", "Stream session not found");

    return {
      ...session,
      durationMinutes:
        session.startedAt && session.endedAt
          ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60_000)
          : null,
    };
  });

  // GET /v1/analytics/audience?period=
  app.get("/v1/analytics/audience", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { period } = PeriodQuery.parse(req.query);
    const since = periodToDate(period);

    const snapshots = await prisma.platformSnapshot.findMany({
      where: { orgId, snapshottedAt: { gte: since } },
      orderBy: { snapshottedAt: "asc" },
    });

    // Total followers across platforms (latest per platform)
    const latestByPlatform = new Map<string, (typeof snapshots)[0]>();
    for (const s of snapshots) {
      const ex = latestByPlatform.get(s.platform);
      if (!ex || s.snapshottedAt > ex.snapshottedAt) latestByPlatform.set(s.platform, s);
    }

    const totalFollowers = Array.from(latestByPlatform.values()).reduce(
      (sum, s) => sum + Number(s.followers),
      0,
    );
    const avgEngagement =
      latestByPlatform.size > 0
        ? Array.from(latestByPlatform.values()).reduce(
            (sum, s) => sum + Number(s.engagementRate),
            0,
          ) / latestByPlatform.size
        : 0;

    // Growth: compare first vs last in period
    const firstByPlatform = new Map<string, (typeof snapshots)[0]>();
    for (const s of snapshots) {
      const ex = firstByPlatform.get(s.platform);
      if (!ex || s.snapshottedAt < ex.snapshottedAt) firstByPlatform.set(s.platform, s);
    }
    const firstFollowers = Array.from(firstByPlatform.values()).reduce(
      (sum, s) => sum + Number(s.followers),
      0,
    );
    const followersGrowth =
      firstFollowers > 0 ? ((totalFollowers - firstFollowers) / firstFollowers) * 100 : 0;

    const byPlatform = Array.from(latestByPlatform.entries()).map(([platform, s]) => ({
      platform,
      followers: Number(s.followers),
      engagementRate: Number(s.engagementRate),
    }));

    return {
      totalFollowers,
      avgEngagement: Number(avgEngagement.toFixed(4)),
      followersGrowth: Number(followersGrowth.toFixed(2)),
      byPlatform,
    };
  });

  // GET /v1/analytics/best-times — best posting time slots
  app.get("/v1/analytics/best-times", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    // Analyze recent published queue items for engagement correlation (cap at 1000)
    const published = await prisma.queueItem.findMany({
      where: { orgId, status: "published", publishedAt: { not: null } },
      select: { platforms: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 1000,
    });

    // Simplified: return suggestions with days-of-week analysis
    const slotMap = new Map<
      string,
      { count: number; platform: string; hour: number; day: number }
    >();
    for (const item of published) {
      if (!item.publishedAt) continue;
      const dt = item.publishedAt;
      const day = dt.getUTCDay(); // 0=Sun
      const hour = dt.getUTCHours();
      for (const platform of item.platforms) {
        const key = `${platform}:${day}:${hour}`;
        const ex = slotMap.get(key) ?? { count: 0, platform, hour, day };
        slotMap.set(key, { ...ex, count: ex.count + 1 });
      }
    }

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const results = Array.from(slotMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((s) => ({
        platform: s.platform,
        dayOfWeek: days[s.day],
        hour: s.hour,
        timezone: "UTC",
        confidence: Math.min(0.95, 0.4 + s.count * 0.05),
        publishCount: s.count,
      }));

    // Merge with defaults for platforms with no data
    const platformDefaults: Record<
      string,
      { dayOfWeek: string; hour: number; confidence: number }
    > = {
      youtube: { dayOfWeek: "Thursday", hour: 18, confidence: 0.72 },
      instagram: { dayOfWeek: "Wednesday", hour: 12, confidence: 0.68 },
      tiktok: { dayOfWeek: "Friday", hour: 20, confidence: 0.65 },
      twitter: { dayOfWeek: "Tuesday", hour: 9, confidence: 0.6 },
      linkedin: { dayOfWeek: "Tuesday", hour: 10, confidence: 0.62 },
    };

    const coveredPlatforms = new Set(results.map((r) => r.platform));
    for (const [platform, def] of Object.entries(platformDefaults)) {
      if (!coveredPlatforms.has(platform)) {
        results.push({ platform, ...def, timezone: "UTC", publishCount: 0 });
      }
    }

    return results;
  });

  // GET /v1/analytics/clips?period=
  app.get("/v1/analytics/clips", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const { period } = PeriodQuery.parse(req.query);
    const since = periodToDate(period);

    const [perf, total] = await prisma.$transaction([
      prisma.contentPerformance.findMany({
        where: { orgId, fetchedAt: { gte: since } },
        take: q.limit,
        skip: q.offset,
        orderBy: { views: "desc" },
        include: {
          asset: { select: { id: true, title: true, cdnUrl: true, duration: true } },
        },
      }),
      prisma.contentPerformance.count({ where: { orgId, fetchedAt: { gte: since } } }),
    ]);

    const items = perf.map((p) => ({
      id: p.id,
      platform: p.platform,
      externalId: p.externalId,
      asset: p.asset,
      views: Number(p.views),
      likes: p.likes,
      comments: p.comments,
      shares: p.shares,
      watchTimeMinutes: Number(p.watchTimeMinutes),
      ctr: Number(p.ctr),
      fetchedAt: p.fetchedAt,
    }));

    return paginate(items, total, q.limit, q.offset);
  });

  // GET /v1/analytics/revenue?period=
  app.get("/v1/analytics/revenue", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { period } = RevenuePeriodQuery.parse(req.query);
    const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const snapshots = await prisma.platformSnapshot.findMany({
      where: { orgId, snapshottedAt: { gte: since }, revenueCents: { gt: 0 } },
      orderBy: { snapshottedAt: "asc" },
    });

    // Monthly rollup
    const monthlyMap = new Map<string, number>();
    for (const s of snapshots) {
      const key = s.snapshottedAt.toISOString().slice(0, 7); // YYYY-MM
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(s.revenueCents));
    }
    const monthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenueCents]) => ({ month, revenueCents }));

    // Platform breakdown (sum all time in period)
    const byPlatform = new Map<string, number>();
    for (const s of snapshots) {
      byPlatform.set(s.platform, (byPlatform.get(s.platform) ?? 0) + Number(s.revenueCents));
    }
    const breakdown = Object.fromEntries(byPlatform);

    // Recent payouts (sponsors with completed status)
    const sponsors = await prisma.sponsor.findMany({
      where: { orgId, status: "completed", endDate: { gte: since } },
      orderBy: { endDate: "desc" },
      take: 10,
    });
    const payouts = sponsors.map((s) => ({
      id: s.id,
      source: s.name,
      amountCents: Number(s.dealValue),
      paidAt: s.endDate,
    }));

    return { monthly, breakdown, payouts };
  });

  // GET /v1/analytics/growth-score
  app.get("/v1/analytics/growth-score", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const since30 = periodToDate("30d");
    const [recentPublished, recentSnapshots, pendingApprovals] = await prisma.$transaction([
      prisma.queueItem.count({
        where: { orgId, status: "published", publishedAt: { gte: since30 } },
      }),
      prisma.platformSnapshot.findMany({
        where: { orgId, snapshottedAt: { gte: since30 } },
        orderBy: { snapshottedAt: "asc" },
        take: 500,
      }),
      prisma.approvalRequest.count({ where: { orgId, status: "pending" } }),
    ]);

    const working: string[] = [];
    const notWorking: string[] = [];
    const actions: string[] = [];

    // Scoring factors
    let score = 50;

    if (recentPublished >= 8) {
      score += 15;
      working.push("Consistent publishing cadence");
    } else if (recentPublished < 4) {
      score -= 10;
      notWorking.push("Low publishing frequency");
      actions.push("Schedule at least 2 posts per week");
    }

    if (recentSnapshots.length > 0) {
      const engagements = recentSnapshots.map((s) => Number(s.engagementRate));
      const avgEng = engagements.reduce((a, b) => a + b, 0) / engagements.length;
      if (avgEng >= 0.03) {
        score += 15;
        working.push("Strong engagement rate");
      } else if (avgEng < 0.01) {
        score -= 10;
        notWorking.push("Low engagement rate");
        actions.push("Experiment with shorter-form content");
      }

      // Follower growth
      const firstSnap = recentSnapshots[0];
      const lastSnap = recentSnapshots[recentSnapshots.length - 1];
      const firstTotal = Number(firstSnap.followers);
      const lastTotal = Number(lastSnap.followers);
      if (firstTotal > 0 && (lastTotal - firstTotal) / firstTotal > 0.05) {
        score += 10;
        working.push("Positive follower growth trend");
      } else if (firstTotal > 0 && lastTotal <= firstTotal) {
        score -= 5;
        notWorking.push("Follower count stagnating");
        actions.push("Cross-promote across platforms");
      }
    }

    if (pendingApprovals > 5) {
      score -= 5;
      notWorking.push("Many agent actions awaiting review");
      actions.push("Review and approve pending agent tasks");
    }

    const connectedPlatforms = await prisma.platformCredential.count({
      where: { orgId, status: "active" },
    });
    if (connectedPlatforms >= 3) {
      score += 5;
      working.push("Multi-platform presence");
    } else {
      actions.push("Connect more social platforms");
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      working,
      notWorking,
      actions,
    };
  });
}
