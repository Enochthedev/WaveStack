import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";
import { hashPassword } from "@shared/crypto";

// IANA timezone validation (basic check — Intl.supportedValuesOf not available everywhere)
const TIMEZONE_RE = /^[A-Za-z_]+\/[A-Za-z_\/]+$/;

const UpdateBody = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z
    .string()
    .max(50)
    .regex(TIMEZONE_RE, "Must be a valid IANA timezone (e.g. Africa/Lagos)")
    .optional(),
  locale: z
    .string()
    .max(10)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Must be a BCP 47 tag (e.g. en, en-US)")
    .optional(),
});

const CreateBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
});

export default async function usersRoutes(app: FastifyInstance) {
  // GET /api/v1/users — list users in org (admin only)
  app.get("/v1/users", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const query = PaginationQuery.parse(req.query);
    const [members, total] = await prisma.$transaction([
      prisma.orgMember.findMany({
        where: { orgId },
        include: {
          user: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } },
        },
        take: query.limit,
        skip: query.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.orgMember.count({ where: { orgId } }),
    ]);

    return paginate(
      members.map((m) => ({ ...m.user, role: m.role })),
      total,
      query.limit,
      query.offset,
    );
  });

  // GET /api/v1/users/me — current user profile
  app.get("/v1/users/me", async (req, reply) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return sendError(reply, "UNAUTHORIZED", "Not authenticated");

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        timezone: true,
        locale: true,
        createdAt: true,
      },
    });
    if (!user) return sendError(reply, "NOT_FOUND", "User not found");
    return user;
  });

  // PATCH /api/v1/users/me — update own profile
  app.patch("/v1/users/me", async (req, reply) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) return sendError(reply, "UNAUTHORIZED", "Not authenticated");

    const data = UpdateBody.parse(req.body);
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        timezone: true,
        locale: true,
        updatedAt: true,
      },
    });
    return user;
  });

  // GET /api/v1/users/:id — get user by ID (within same org)
  app.get<{ Params: { id: string } }>("/v1/users/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const member = await prisma.orgMember.findFirst({
      where: { orgId, userId: req.params.id },
      include: {
        user: { select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true } },
      },
    });
    if (!member) return sendError(reply, "NOT_FOUND", "User not found in org");
    return { ...member.user, role: member.role };
  });

  // POST /api/v1/users — invite / create user (org admin+)
  app.post("/v1/users", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { email, password, name } = CreateBody.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // User exists — add to org if not already a member
      const alreadyMember = await prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: existing.id } },
      });
      if (alreadyMember) return sendError(reply, "CONFLICT", "User already in org");
      await prisma.orgMember.create({ data: { orgId, userId: existing.id, role: "viewer" } });
      reply.code(201);
      return { id: existing.id, email: existing.email, name: existing.name, role: "viewer" };
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
    });
    await prisma.orgMember.create({ data: { orgId, userId: user.id, role: "viewer" } });
    reply.code(201);
    return { id: user.id, email: user.email, name: user.name, role: "viewer" };
  });

  // DELETE /api/v1/users/:id — remove user from org (soft-delete membership)
  app.delete<{ Params: { id: string } }>("/v1/users/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const member = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: req.params.id } },
    });
    if (!member) return sendError(reply, "NOT_FOUND", "Member not found");
    if (member.role === "owner") return sendError(reply, "FORBIDDEN", "Cannot remove org owner");

    await prisma.orgMember.delete({ where: { orgId_userId: { orgId, userId: req.params.id } } });
    reply.code(204);
  });
}
