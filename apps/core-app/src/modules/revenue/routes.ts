import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const MonthsQuery = z.object({
  months: z.coerce.number().int().min(1).max(60).default(12),
});
const YearQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const SponsorBody = z.object({
  name: z.string().min(1),
  logoUrl: z.string().optional(),
  contactEmail: z.string().email().optional(),
  dealValue: z.number().int().min(0),
  status: z.string().default("active"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  deliverables: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        dueDate: z.string().datetime().optional(),
      }),
    )
    .default([]),
});

export default async function routes(app: FastifyInstance) {
  // GET /v1/revenue/overview
  app.get("/v1/revenue/overview", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const snapshots = await prisma.platformSnapshot.findMany({
      where: { orgId },
      orderBy: { snapshottedAt: "desc" },
      take: 1000,
    });

    const latestByPlatform = new Map<string, (typeof snapshots)[0]>();
    for (const s of snapshots) {
      const ex = latestByPlatform.get(s.platform);
      if (!ex || s.snapshottedAt > ex.snapshottedAt) latestByPlatform.set(s.platform, s);
    }

    const allTime = Array.from(latestByPlatform.values()).reduce(
      (sum, s) => sum + Number(s.revenueCents),
      0,
    );

    const todaySnaps = snapshots.filter((s) => s.snapshottedAt >= todayStart);
    const monthSnaps = snapshots.filter((s) => s.snapshottedAt >= monthStart);

    const today = todaySnaps.reduce((sum, s) => sum + Number(s.revenueCents), 0);
    const month = monthSnaps.reduce((sum, s) => sum + Number(s.revenueCents), 0);

    // Forecast: project month's pace to end of month
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const forecast = dayOfMonth > 0 ? Math.round((month / dayOfMonth) * daysInMonth) : 0;

    const breakdown = Object.fromEntries(
      Array.from(latestByPlatform.entries()).map(([p, s]) => [p, Number(s.revenueCents)]),
    );

    return { today, month, forecast, allTime, breakdown };
  });

  // GET /v1/revenue/history?months=12
  app.get("/v1/revenue/history", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { months } = MonthsQuery.parse(req.query);
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const snapshots = await prisma.platformSnapshot.findMany({
      where: { orgId, snapshottedAt: { gte: since }, revenueCents: { gt: 0 } },
      orderBy: { snapshottedAt: "asc" },
    });

    const monthlyMap = new Map<string, number>();
    for (const s of snapshots) {
      const key = s.snapshottedAt.toISOString().slice(0, 7);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(s.revenueCents));
    }

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenueCents]) => ({ month, revenueCents }));
  });

  // GET /v1/revenue/payouts
  app.get("/v1/revenue/payouts", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const { year } = YearQuery.parse(req.query);

    const where: any = { orgId, status: "completed" };
    if (year) {
      where.endDate = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      };
    }

    const [sponsors, total] = await prisma.$transaction([
      prisma.sponsor.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { endDate: "desc" },
      }),
      prisma.sponsor.count({ where }),
    ]);

    const payouts = sponsors.map((s) => ({
      id: s.id,
      source: s.name,
      amountCents: Number(s.dealValue),
      paidAt: s.endDate,
      status: s.status,
    }));

    return paginate(payouts, total, q.limit, q.offset);
  });

  // GET /v1/revenue/sponsors
  app.get("/v1/revenue/sponsors", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const status = (req.query as any).status as string | undefined;

    const where: any = { orgId };
    if (status) where.status = status;

    const [sponsors, total] = await prisma.$transaction([
      prisma.sponsor.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
        include: { deliverables: true },
      }),
      prisma.sponsor.count({ where }),
    ]);

    return paginate(
      sponsors.map((s) => ({ ...s, dealValue: Number(s.dealValue) })),
      total,
      q.limit,
      q.offset,
    );
  });

  // POST /v1/revenue/sponsors
  app.post("/v1/revenue/sponsors", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const data = SponsorBody.parse(req.body);
    const { deliverables, ...rest } = data;

    const sponsor = await prisma.sponsor.create({
      data: {
        orgId,
        ...rest,
        dealValue: BigInt(rest.dealValue),
        startDate: rest.startDate ? new Date(rest.startDate) : undefined,
        endDate: rest.endDate ? new Date(rest.endDate) : undefined,
        deliverables: {
          create: deliverables.map((d) => ({
            title: d.title,
            description: d.description,
            dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
          })),
        },
      },
      include: { deliverables: true },
    });

    reply.code(201);
    return { ...sponsor, dealValue: Number(sponsor.dealValue) };
  });

  // PATCH /v1/revenue/sponsors/:id
  app.patch<{ Params: { id: string } }>("/v1/revenue/sponsors/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const sponsor = await prisma.sponsor.findUnique({ where: { id: req.params.id, orgId } });
    if (!sponsor) return sendError(reply, "NOT_FOUND", "Sponsor not found");

    const patch = SponsorBody.partial().parse(req.body);
    const { dealValue, startDate, endDate, deliverables: _deliverables, ...rest } = patch;

    const updated = await prisma.sponsor.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(dealValue !== undefined && { dealValue: BigInt(dealValue) }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: new Date(endDate) }),
      },
      include: { deliverables: true },
    });

    return { ...updated, dealValue: Number(updated.dealValue) };
  });

  // DELETE /v1/revenue/sponsors/:id
  app.delete<{ Params: { id: string } }>("/v1/revenue/sponsors/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const sponsor = await prisma.sponsor.findUnique({ where: { id: req.params.id, orgId } });
    if (!sponsor) return sendError(reply, "NOT_FOUND", "Sponsor not found");

    await prisma.sponsor.delete({ where: { id: req.params.id } });
    reply.code(204);
  });

  // POST /v1/revenue/sponsors/:sponsorId/deliverables/:deliverableId/complete
  app.post<{ Params: { sponsorId: string; deliverableId: string } }>(
    "/v1/revenue/sponsors/:sponsorId/deliverables/:deliverableId/complete",
    async (req, reply) => {
      const orgId = req.headers["x-org-id"] as string;
      if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

      const sponsor = await prisma.sponsor.findUnique({
        where: { id: req.params.sponsorId, orgId },
      });
      if (!sponsor) return sendError(reply, "NOT_FOUND", "Sponsor not found");

      await prisma.sponsorDeliverable.update({
        where: { id: req.params.deliverableId, sponsorId: req.params.sponsorId },
        data: { completedAt: new Date(), status: "completed" },
      });

      const updated = await prisma.sponsor.findUnique({
        where: { id: req.params.sponsorId },
        include: { deliverables: true },
      });
      return { ...updated, dealValue: Number(updated!.dealValue) };
    },
  );
}
