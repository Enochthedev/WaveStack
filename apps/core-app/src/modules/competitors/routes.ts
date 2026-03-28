import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const AddBody = z.object({
  channelName: z.string().min(1),
  platform: z.string(),
  profileUrl: z.string().optional(),
});

const TRENDING_GAMES = [
  { game: "Valorant", viewers: 280000, trend: "up", platforms: ["twitch", "youtube"] },
  { game: "League of Legends", viewers: 260000, trend: "flat", platforms: ["twitch", "youtube"] },
  { game: "Minecraft", viewers: 220000, trend: "up", platforms: ["twitch", "youtube", "tiktok"] },
  { game: "Fortnite", viewers: 200000, trend: "up", platforms: ["twitch", "youtube", "tiktok"] },
  { game: "GTA V", viewers: 190000, trend: "flat", platforms: ["twitch", "youtube"] },
  { game: "Apex Legends", viewers: 170000, trend: "down", platforms: ["twitch", "youtube"] },
  { game: "Call of Duty", viewers: 160000, trend: "up", platforms: ["twitch", "youtube"] },
];

export default async function routes(app: FastifyInstance) {
  app.get("/v1/competitors", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const where = { orgId };
    const [competitors, total] = await prisma.$transaction([
      prisma.competitor.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { followers: "desc" },
      }),
      prisma.competitor.count({ where }),
    ]);
    return paginate(
      competitors.map((c) => ({
        ...c,
        followers: Number(c.followers),
        avgViews: Number(c.avgViews),
      })),
      total,
      q.limit,
      q.offset,
    );
  });

  app.post("/v1/competitors", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    const data = AddBody.parse(req.body);
    const competitor = await prisma.competitor.create({ data: { orgId, ...data } });
    reply.code(201);
    return {
      ...competitor,
      followers: Number(competitor.followers),
      avgViews: Number(competitor.avgViews),
    };
  });

  app.delete<{ Params: { id: string } }>("/v1/competitors/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    const existing = await prisma.competitor.findUnique({ where: { id: req.params.id, orgId } });
    if (!existing) return sendError(reply, "NOT_FOUND", "Competitor not found");
    await prisma.competitor.delete({ where: { id: req.params.id } });
    reply.code(204);
  });

  app.get("/v1/competitors/trending", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    return TRENDING_GAMES;
  });
}
