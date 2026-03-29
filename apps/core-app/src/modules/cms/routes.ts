import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const CreateBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const UpdateBody = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export default async function routes(app: FastifyInstance) {
  // GET /v1/projects
  app.get("/v1/projects", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where: { orgId, deletedAt: null },
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.project.count({ where: { orgId, deletedAt: null } }),
    ]);
    return paginate(projects, total, q.limit, q.offset);
  });

  // GET /v1/projects/:id
  app.get<{ Params: { id: string } }>("/v1/projects/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const project = await prisma.project.findUnique({
      where: { id: req.params.id, orgId, deletedAt: null },
    });
    if (!project) return sendError(reply, "NOT_FOUND", "Project not found");
    return project;
  });

  // POST /v1/projects
  app.post("/v1/projects", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const data = CreateBody.parse(req.body);
    const project = await prisma.project.create({
      data: { orgId, ...data, settings: (data.settings ?? {}) as Prisma.InputJsonValue },
    });
    reply.code(201);
    return project;
  });

  // PATCH /v1/projects/:id
  app.patch<{ Params: { id: string } }>("/v1/projects/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const existing = await prisma.project.findUnique({
      where: { id: req.params.id, orgId, deletedAt: null },
    });
    if (!existing) return sendError(reply, "NOT_FOUND", "Project not found");

    const { settings, ...rest } = UpdateBody.parse(req.body);
    return prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(settings !== undefined && { settings: settings as Prisma.InputJsonValue }),
      },
    });
  });

  // DELETE /v1/projects/:id (soft delete)
  app.delete<{ Params: { id: string } }>("/v1/projects/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const existing = await prisma.project.findUnique({
      where: { id: req.params.id, orgId, deletedAt: null },
    });
    if (!existing) return sendError(reply, "NOT_FOUND", "Project not found");

    await prisma.project.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    reply.code(204);
  });
}
