import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";

const PLANS = {
  free: { name: "Free", price: 0, features: ["1 platform", "basic analytics", "5 clips/mo"] },
  starter: {
    name: "Starter",
    price: 29,
    features: ["3 platforms", "full analytics", "50 clips/mo", "queue scheduling"],
  },
  pro: {
    name: "Pro",
    price: 79,
    features: [
      "unlimited platforms",
      "advanced analytics",
      "unlimited clips",
      "automation",
      "competitors",
    ],
  },
  agency: {
    name: "Agency",
    price: 199,
    features: [
      "everything in Pro",
      "multi-org",
      "white-label",
      "priority support",
      "custom agents",
    ],
  },
};

const UpgradeBody = z.object({ plan: z.enum(["free", "starter", "pro", "agency"]) });

export default async function routes(app: FastifyInstance) {
  // GET /v1/billing — current billing info + plan
  app.get("/v1/billing", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const billing = await prisma.billing.findUnique({ where: { orgId } });
    if (!billing) {
      // Auto-create free tier record on first access
      const created = await prisma.billing.create({
        data: {
          orgId,
          plan: "free",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: addDays(new Date(), 30),
        },
      });
      return { ...created, planDetails: PLANS["free"] };
    }

    return { ...billing, planDetails: PLANS[billing.plan as keyof typeof PLANS] ?? PLANS["free"] };
  });

  // GET /v1/billing/invoices
  app.get("/v1/billing/invoices", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const invoices = await prisma.invoice.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 24,
    });
    return invoices.map((i) => ({ ...i, amount: Number(i.amount) }));
  });

  // POST /v1/billing/upgrade
  app.post("/v1/billing/upgrade", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { plan } = UpgradeBody.parse(req.body);

    const billing = await prisma.billing.upsert({
      where: { orgId },
      update: {
        plan,
        status: plan === "free" ? "active" : "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: addDays(new Date(), 30),
      },
      create: {
        orgId,
        plan,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: addDays(new Date(), 30),
      },
    });

    // Create invoice record for non-free upgrades
    if (PLANS[plan].price > 0) {
      await prisma.invoice.create({
        data: {
          orgId,
          amount: PLANS[plan].price,
          currency: "usd",
          status: "paid",
          description: `${PLANS[plan].name} plan — monthly`,
          periodStart: billing.currentPeriodStart,
          periodEnd: billing.currentPeriodEnd,
        },
      });
    }

    return { ...billing, planDetails: PLANS[plan] };
  });

  // POST /v1/billing/cancel
  app.post("/v1/billing/cancel", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const billing = await prisma.billing.findUnique({ where: { orgId } });
    if (!billing) return sendError(reply, "NOT_FOUND", "No billing record found");
    if (billing.plan === "free") return sendError(reply, "BAD_REQUEST", "Cannot cancel free plan");

    const updated = await prisma.billing.update({
      where: { orgId },
      data: { status: "canceled", canceledAt: new Date() },
    });

    return {
      ...updated,
      message: "Subscription canceled. Access continues until end of billing period.",
    };
  });

  // GET /v1/billing/plans — list all available plans
  app.get("/v1/billing/plans", async () => {
    return Object.entries(PLANS).map(([id, p]) => ({ id, ...p }));
  });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
