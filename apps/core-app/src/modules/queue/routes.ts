import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../shared/db";
import { publishQueue } from "../../shared/queue";

const Body = z.object({
  projectId: z.string(),
  assetId: z.string(),
  title: z.string().max(120),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  platforms: z.array(z.enum(["youtube","instagram","x"])).min(1),
  scheduleAt: z.string().datetime().optional()
});

export default async function routes(app: FastifyInstance) {
  app.post("/v1/queue", async (req, reply) => {
    const idem = req.headers["idempotency-key"];
    if (!idem || typeof idem !== "string") return reply.code(400).send({ message: "Missing Idempotency-Key" });

    const data = Body.parse(req.body);
    const existing = await prisma.queueItem.findUnique({ where: { idempotencyKey: idem }});
    if (existing) return existing;

    const qi = await prisma.queueItem.create({
      data: {
        orgId: "org_demo", // TODO: replace with JWT org
        ...data,
        idempotencyKey: idem,
        status: "queued"
      }
    });

    for (const p of qi.platforms) {
      await publishQueue.add("publish", { queueItemId: qi.id, platform: p }, { jobId: `${qi.id}:${p}` });
    }
    reply.code(201);
    return qi;
  });

  app.get("/health", async () => ({ status: "ok" }));
}
