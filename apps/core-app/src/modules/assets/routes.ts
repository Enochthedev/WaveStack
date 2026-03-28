import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const CreateBody = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  duration: z.number().int().positive().optional(),
  sizeBytes: z.number().int().positive().optional(),
  storagePath: z.string().optional(),
  cdnUrl: z.string().url().optional(),
  sourceStreamId: z.string().optional(),
  sourceStartSec: z.number().optional(),
  sourceEndSec: z.number().optional(),
  projectId: z.string().optional(),
});

const UpdateBody = CreateBody.partial().extend({
  status: z.enum(["pending", "processing", "ready", "failed"]).optional(),
});

export default async function assetsRoutes(app: FastifyInstance) {
  // GET /api/v1/assets
  app.get("/v1/assets", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const status = (req.query as any).status as string | undefined;
    const where = { orgId, ...(status && { status }) };

    const [assets, total] = await prisma.$transaction([
      prisma.asset.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.asset.count({ where }),
    ]);
    return paginate(assets, total, q.limit, q.offset);
  });

  // GET /api/v1/assets/:id
  app.get<{ Params: { id: string } }>("/v1/assets/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const asset = await prisma.asset.findUnique({ where: { id: req.params.id, orgId } });
    if (!asset) return sendError(reply, "NOT_FOUND", "Asset not found");
    return asset;
  });

  // POST /api/v1/assets
  app.post("/v1/assets", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const data = CreateBody.parse(req.body);
    const asset = await prisma.asset.create({ data: { orgId, ...data } });
    reply.code(201);
    return asset;
  });

  // PATCH /api/v1/assets/:id
  app.patch<{ Params: { id: string } }>("/v1/assets/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const existing = await prisma.asset.findUnique({ where: { id: req.params.id, orgId } });
    if (!existing) return sendError(reply, "NOT_FOUND", "Asset not found");

    const data = UpdateBody.parse(req.body);
    return prisma.asset.update({ where: { id: req.params.id }, data });
  });

  // DELETE /api/v1/assets/:id
  app.delete<{ Params: { id: string } }>("/v1/assets/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const existing = await prisma.asset.findUnique({ where: { id: req.params.id, orgId } });
    if (!existing) return sendError(reply, "NOT_FOUND", "Asset not found");

    await prisma.asset.delete({ where: { id: req.params.id } });
    reply.code(204);
  });
}
