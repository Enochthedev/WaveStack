import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";

const UpsertBody = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(2000),
  userId: z.string().optional(),
  source: z.enum(["auto", "manual"]).default("auto"),
});

const CaptureBody = z.object({
  orgId: z.string(),
  userId: z.string().optional(),
  exampleType: z.string().default("chat_response"),
  prompt: z.string(),
  response: z.string(),
  modelUsed: z.string().optional(),
  platform: z.string().optional(),
  source: z.string().default("auto"),
  consentGiven: z.boolean().default(true),
});

export default async function routes(app: FastifyInstance) {
  // GET /v1/memory — fetch memories for an org (optionally scoped to userId)
  app.get("/v1/memory", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { userId } = req.query as { userId?: string };
    const where: any = { orgId };
    if (userId) where.userId = userId;

    return prisma.userMemory.findMany({ where, orderBy: { updatedAt: "desc" } });
  });

  // PUT /v1/memory — upsert a single memory entry
  app.put("/v1/memory", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { key, value, userId, source } = UpsertBody.parse(req.body);

    return prisma.userMemory.upsert({
      where: { orgId_userId_key: { orgId, userId: userId ?? null, key } },
      update: { value, source },
      create: { orgId, userId: userId ?? null, key, value, source },
    });
  });

  // DELETE /v1/memory/:key — delete a specific memory
  app.delete<{ Params: { key: string } }>("/v1/memory/:key", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");
    const { userId } = req.query as { userId?: string };

    await prisma.userMemory.deleteMany({
      where: { orgId, key: req.params.key, userId: userId ?? null },
    });
    reply.code(204);
  });

  // POST /v1/training/examples — capture an interaction (called from model-router)
  // Internal only — model-router posts here after every routed response
  app.post("/v1/training/examples", async (req, reply) => {
    const isInternal = req.headers["x-internal-service"] === process.env.INTERNAL_SERVICE_SECRET;
    if (!isInternal) return sendError(reply, "FORBIDDEN", "Internal use only");

    const data = CaptureBody.parse(req.body);

    // Respect user-level opt-out: if we can look up the user, re-check their consent flag
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { dataConsent: true },
      });
      if (user && !user.dataConsent) {
        reply.code(204); // silently skip
        return;
      }
    }

    if (!data.consentGiven) {
      reply.code(204);
      return;
    }

    const example = await prisma.trainingExample.create({
      data: {
        orgId: data.orgId,
        userId: data.userId,
        exampleType: data.exampleType,
        prompt: data.prompt,
        response: data.response,
        modelUsed: data.modelUsed,
        platform: data.platform,
        source: data.source,
        consentGiven: data.consentGiven,
      },
    });

    reply.code(201);
    return example;
  });

  // GET /v1/training/examples — list captured examples (for labeling UI)
  app.get("/v1/training/examples", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { platform, modelUsed, labeled } = req.query as Record<string, string>;
    const where: any = { orgId, consentGiven: true };
    if (platform) where.platform = platform;
    if (modelUsed) where.modelUsed = modelUsed;
    if (labeled === "false") where.usedInTraining = false;

    const examples = await prisma.trainingExample.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return examples;
  });

  // PATCH /v1/training/examples/:id — update quality score / feedback (human labeling)
  app.patch<{ Params: { id: string } }>("/v1/training/examples/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { qualityScore, feedback } = req.body as { qualityScore?: number; feedback?: string };

    const example = await prisma.trainingExample.findUnique({
      where: { id: req.params.id },
    });
    if (!example || example.orgId !== orgId)
      return sendError(reply, "NOT_FOUND", "Example not found");

    return prisma.trainingExample.update({
      where: { id: req.params.id },
      data: {
        ...(qualityScore !== undefined && { qualityScore }),
        ...(feedback !== undefined && { feedback }),
        source: "human_labeled",
      },
    });
  });

  // POST /v1/training/consent — update data consent preference
  app.post("/v1/training/consent", async (req, reply) => {
    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) return sendError(reply, "UNAUTHORIZED", "Missing user context");

    const { consent } = z.object({ consent: z.boolean() }).parse(req.body);

    await prisma.user.update({
      where: { id: userId },
      data: { dataConsent: consent },
    });

    reply.code(204);
  });
}
