import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";

const CreateBody = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

const UpdateBody = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
});

const MemberRoleBody = z.object({
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

export default async function orgsRoutes(app: FastifyInstance) {
  // GET /api/v1/orgs/current — get current org
  app.get("/v1/orgs/current", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const org = await prisma.organization.findUnique({
      where: { id: orgId, deletedAt: null },
      select: { id: true, name: true, slug: true, plan: true, settings: true, createdAt: true },
    });
    if (!org) return sendError(reply, "NOT_FOUND", "Organization not found");
    return org;
  });

  // POST /api/v1/orgs — create a new org for the current user
  app.post("/v1/orgs", async (req, reply) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return sendError(reply, "UNAUTHORIZED", "Not authenticated");

    const { name, slug } = CreateBody.parse(req.body);

    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) return sendError(reply, "CONFLICT", "Slug already taken");

    const org = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name, slug } });
      await tx.orgMember.create({ data: { orgId: org.id, userId, role: "owner" } });
      return org;
    });

    reply.code(201);
    return { id: org.id, name: org.name, slug: org.slug, plan: org.plan };
  });

  // PATCH /api/v1/orgs/current — update current org (admin+)
  app.patch("/v1/orgs/current", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const data = UpdateBody.parse(req.body);
    const org = await prisma.organization.update({
      where: { id: orgId },
      data,
      select: { id: true, name: true, slug: true, plan: true, settings: true, updatedAt: true },
    });
    return org;
  });

  // DELETE /api/v1/orgs/current — soft-delete org (owner only)
  app.delete("/v1/orgs/current", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    await prisma.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() },
    });
    reply.code(204);
  });

  // GET /api/v1/orgs/current/members — list members
  app.get("/v1/orgs/current/members", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
    return members.map((m) => ({ ...m.user, role: m.role, joinedAt: m.createdAt }));
  });

  // PATCH /api/v1/orgs/current/members/:userId — update member role (owner/admin only)
  app.patch<{ Params: { userId: string } }>(
    "/v1/orgs/current/members/:userId",
    async (req, reply) => {
      const orgId = req.headers["x-org-id"] as string;
      if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

      const { role } = MemberRoleBody.parse(req.body);
      const member = await prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: req.params.userId } },
      });
      if (!member) return sendError(reply, "NOT_FOUND", "Member not found");
      if (member.role === "owner") return sendError(reply, "FORBIDDEN", "Cannot change owner role");

      await prisma.orgMember.update({
        where: { orgId_userId: { orgId, userId: req.params.userId } },
        data: { role },
      });
      return { userId: req.params.userId, role };
    },
  );
}
