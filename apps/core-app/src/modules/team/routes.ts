import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { generateToken } from "@shared/crypto";
import { paginate, PaginationQuery } from "@shared/pagination";

const ROLES = ["owner", "admin", "editor", "viewer"] as const;

const InviteBody = z.object({
  email: z.string().email(),
  role: z.enum(ROLES),
});

const RoleUpdateBody = z.object({ role: z.enum(ROLES) });

const INVITE_TTL_DAYS = 7;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function routes(app: FastifyInstance) {
  // GET /v1/team/members
  app.get("/v1/team/members", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const where = { orgId };
    const [members, total] = await prisma.$transaction([
      prisma.orgMember.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.orgMember.count({ where }),
    ]);
    return paginate(members, total, q.limit, q.offset);
  });

  // PATCH /v1/team/members/:userId — update role
  app.patch<{ Params: { userId: string } }>("/v1/team/members/:userId", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const requesterId = req.headers["x-user-id"] as string | undefined;
    if (!requesterId) return sendError(reply, "UNAUTHORIZED", "Missing user context");

    // Only owners and admins can change roles
    const requester = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: requesterId } },
    });
    if (!requester || !["owner", "admin"].includes(requester.role)) {
      return sendError(reply, "FORBIDDEN", "Only owners and admins can update roles");
    }

    const { role } = RoleUpdateBody.parse(req.body);

    // Prevent demoting last owner
    if (role !== "owner") {
      const target = await prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: req.params.userId } },
      });
      if (target?.role === "owner") {
        const ownerCount = await prisma.orgMember.count({ where: { orgId, role: "owner" } });
        if (ownerCount <= 1) return sendError(reply, "BAD_REQUEST", "Cannot demote the last owner");
      }
    }

    return prisma.orgMember.update({
      where: { orgId_userId: { orgId, userId: req.params.userId } },
      data: { role },
    });
  });

  // DELETE /v1/team/members/:userId — remove member
  app.delete<{ Params: { userId: string } }>("/v1/team/members/:userId", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const requesterId = req.headers["x-user-id"] as string | undefined;
    if (!requesterId) return sendError(reply, "UNAUTHORIZED", "Missing user context");

    const requester = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: requesterId } },
    });
    if (!requester || !["owner", "admin"].includes(requester.role)) {
      return sendError(reply, "FORBIDDEN", "Only owners and admins can remove members");
    }

    const target = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: req.params.userId } },
    });
    if (!target) return sendError(reply, "NOT_FOUND", "Member not found");

    if (target.role === "owner") {
      const ownerCount = await prisma.orgMember.count({ where: { orgId, role: "owner" } });
      if (ownerCount <= 1) return sendError(reply, "BAD_REQUEST", "Cannot remove the last owner");
    }

    await prisma.orgMember.delete({
      where: { orgId_userId: { orgId, userId: req.params.userId } },
    });
    reply.code(204);
  });

  // GET /v1/team/invites
  app.get("/v1/team/invites", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const where = { orgId, status: "pending" as const };
    const [invites, total] = await prisma.$transaction([
      prisma.teamInvite.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.teamInvite.count({ where }),
    ]);
    return paginate(invites, total, q.limit, q.offset);
  });

  // POST /v1/team/invites — create invite
  app.post("/v1/team/invites", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const inviterId = req.headers["x-user-id"] as string | undefined;
    if (!inviterId) return sendError(reply, "UNAUTHORIZED", "Missing user context");

    const requester = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: inviterId } },
    });
    if (!requester || !["owner", "admin"].includes(requester.role)) {
      return sendError(reply, "FORBIDDEN", "Only owners and admins can invite members");
    }

    const { email, role } = InviteBody.parse(req.body);

    // Check if already a member
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: existingUser.id } },
      });
      if (alreadyMember) return sendError(reply, "CONFLICT", "User is already a member");
    }

    // Upsert invite (reset expiry if already pending)
    const token = generateToken(32);
    const invite = await prisma.teamInvite.upsert({
      where: { orgId_email: { orgId, email } },
      update: { role, token, expiresAt: addDays(new Date(), INVITE_TTL_DAYS), status: "pending" },
      create: {
        orgId,
        email,
        role,
        token,
        invitedBy: inviterId,
        expiresAt: addDays(new Date(), INVITE_TTL_DAYS),
      },
    });

    reply.code(201);
    return invite;
  });

  // DELETE /v1/team/invites/:id — revoke invite
  app.delete<{ Params: { id: string } }>("/v1/team/invites/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const invite = await prisma.teamInvite.findUnique({ where: { id: req.params.id, orgId } });
    if (!invite) return sendError(reply, "NOT_FOUND", "Invite not found");

    await prisma.teamInvite.delete({ where: { id: req.params.id } });
    reply.code(204);
  });

  // POST /v1/team/invites/:token/accept — accept an invite (called from onboarding)
  app.post<{ Params: { token: string } }>("/v1/team/invites/:token/accept", async (req, reply) => {
    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) return sendError(reply, "UNAUTHORIZED", "Missing user context");

    const invite = await prisma.teamInvite.findFirst({
      where: { token: req.params.token, status: "pending" },
    });
    if (!invite) return sendError(reply, "NOT_FOUND", "Invite not found or already used");
    if (invite.expiresAt < new Date()) return sendError(reply, "BAD_REQUEST", "Invite has expired");

    const [member] = await prisma.$transaction([
      prisma.orgMember.create({ data: { orgId: invite.orgId, userId, role: invite.role } }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data: { status: "accepted", acceptedAt: new Date() },
      }),
    ]);

    reply.code(201);
    return member;
  });
}
