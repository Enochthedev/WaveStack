import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";
import { sanitizeText } from "@shared/sanitize";

const AnalyzeTitleBody = z.object({ title: z.string().min(1), platform: z.string() });

function scoreTitle(title: string, platform: string) {
  const words = title.toLowerCase().split(/\s+/).filter(Boolean);
  const suggestions: string[] = [];
  let score = 50;
  if (title.length >= 40 && title.length <= 70) score += 15;
  else if (title.length < 20) {
    score -= 15;
    suggestions.push("Title too short — aim 40-70 chars");
  } else if (title.length > 100) {
    score -= 10;
    suggestions.push("Title too long — keep under 100");
  }
  if (/\d/.test(title)) score += 5;
  if (/[?!]/.test(title)) score += 5;
  if (
    ["best", "top", "how", "why", "ultimate", "guide", "tips", "secret"].some((w) =>
      words.includes(w),
    )
  )
    score += 10;
  else suggestions.push("Add a power word (best, top, how, why, ultimate)");
  if (platform === "youtube" && title.length > 70)
    suggestions.push("YouTube titles best under 70 chars");
  if (platform === "tiktok" && title.length > 50)
    suggestions.push("TikTok captions best under 50 chars");
  const keywords = words
    .filter((w) => w.length > 3 && !["this", "that", "with", "from", "have", "will"].includes(w))
    .slice(0, 8);
  return { score: Math.min(100, score), suggestions, keywords };
}

const TRENDING = [
  { keyword: "gaming setup", volume: 450000, competition: "high", trend: "up" },
  { keyword: "tutorial", volume: 380000, competition: "medium", trend: "up" },
  { keyword: "challenge", volume: 310000, competition: "high", trend: "up" },
  { keyword: "vlog", volume: 290000, competition: "medium", trend: "flat" },
  { keyword: "review", volume: 240000, competition: "high", trend: "flat" },
  { keyword: "tips", volume: 210000, competition: "low", trend: "up" },
];

export default async function routes(app: FastifyInstance) {
  app.get("/v1/seo/scores", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    const q = PaginationQuery.parse(req.query);
    const [items, total] = await prisma.$transaction([
      prisma.seoScore.findMany({
        where: { orgId },
        take: q.limit,
        skip: q.offset,
        orderBy: { fetchedAt: "desc" },
      }),
      prisma.seoScore.count({ where: { orgId } }),
    ]);
    return paginate(items, total, q.limit, q.offset);
  });

  app.post("/v1/seo/analyze-title", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    const raw = AnalyzeTitleBody.parse(req.body);
    const title = sanitizeText(raw.title, 200);
    const platform = raw.platform;
    const result = scoreTitle(title, platform);
    await prisma.seoScore.create({
      data: {
        orgId,
        platform,
        title,
        score: result.score,
        keywords: result.keywords,
        suggestions: result.suggestions,
      },
    });
    return result;
  });

  app.get("/v1/seo/keywords", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    const topic = (req.query as any).topic as string | undefined;
    if (topic)
      return [{ keyword: topic, volume: 50000, competition: "medium", trend: "up" }, ...TRENDING];
    return TRENDING;
  });

  app.get("/v1/seo/trending", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    return TRENDING.filter((k) => k.trend === "up");
  });

  app.post("/v1/seo/tags", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    const { topic } = z.object({ topic: z.string().min(1) }).parse(req.body);
    const words = topic.toLowerCase().split(/\s+/);
    return [topic, ...words.map((w) => `#${w}`), "#contentcreator", "#streaming", "#gaming"].slice(
      0,
      15,
    );
  });
}
