/**
 * Registration + login endpoints.
 * /api/auth/register  — create user + default org
 * /api/auth/login     — password login → JWT
 * /api/auth/refresh   — rotate refresh token
 * /api/auth/logout    — revoke refresh token
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { prisma } from "@shared/db";
import { hashPassword, verifyPassword, generateToken } from "@shared/crypto";
import { sendError } from "@shared/errors";
import { getKeypair } from "./keys";

const RegisterBody = z.object({
  email: z.string().email().max(255),
  password: z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  name: z.string().min(1).max(100).optional(),
  orgName: z.string().min(1).max(100).optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshBody = z.object({
  refreshToken: z.string().min(1),
});

const REFRESH_TTL_DAYS = Number(process.env.AUTH_REFRESH_TTL_DAYS ?? 30);
const ACCESS_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS ?? 900);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

async function issueTokens(userId: string, orgId: string, role: string) {
  const { priv, kid } = await getKeypair();
  const now = Math.floor(Date.now() / 1000);

  const accessToken = jwt.sign(
    {
      sub: userId,
      org_id: orgId,
      role,
      iat: now,
      nbf: now - 5,
      aud: process.env.AUTH_AUDIENCE,
      iss: process.env.AUTH_ISSUER,
    },
    priv,
    { algorithm: "RS256", expiresIn: ACCESS_TTL_SECONDS, keyid: kid },
  );

  const refreshToken = generateToken(48);
  const refreshHash = generateToken(16) + "." + Buffer.from(refreshToken).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000);

  // Store refresh token hash in RevokedToken table inverted — or as a separate RefreshToken model.
  // For simplicity we embed the jti in the JWT and track revocations. Refresh tokens
  // are stored as a signed JWT containing the hash so we can validate without a DB hit.
  const refreshJwt = jwt.sign(
    { sub: userId, org_id: orgId, type: "refresh", token_hash: refreshHash },
    priv,
    { algorithm: "RS256", expiresIn: `${REFRESH_TTL_DAYS}d`, keyid: kid },
  );

  return { accessToken, refreshToken: refreshJwt, expiresIn: ACCESS_TTL_SECONDS, expiresAt };
}

export default async function authRegisterRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post("/register", async (req, reply) => {
    const body = RegisterBody.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return sendError(reply, "CONFLICT", "Email already registered");

    const passwordHash = await hashPassword(body.password);

    const { user, org, member } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: body.email, passwordHash, name: body.name },
      });
      const orgName = body.orgName ?? body.name ?? body.email.split("@")[0];
      const slug = await uniqueSlug(slugify(orgName));
      const org = await tx.organization.create({ data: { name: orgName, slug } });
      const member = await tx.orgMember.create({
        data: { orgId: org.id, userId: user.id, role: "owner" },
      });
      return { user, org, member };
    });

    const tokens = await issueTokens(user.id, org.id, member.role);
    reply.code(201);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      org: { id: org.id, name: org.name, slug: org.slug },
      ...tokens,
    };
  });

  // POST /api/auth/login
  app.post("/login", async (req, reply) => {
    const { email, password } = LoginBody.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
      select: { id: true, email: true, name: true, avatarUrl: true, passwordHash: true },
    });
    if (!user || !user.passwordHash) return sendError(reply, "UNAUTHORIZED", "Invalid credentials");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return sendError(reply, "UNAUTHORIZED", "Invalid credentials");

    // Get primary org membership
    const member = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      include: { org: { select: { id: true, name: true, slug: true, plan: true } } },
      orderBy: { createdAt: "asc" },
    });
    if (!member) return sendError(reply, "FORBIDDEN", "No org membership");

    const tokens = await issueTokens(user.id, member.orgId, member.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      org: member.org,
      ...tokens,
    };
  });

  // POST /api/auth/refresh — rotate refresh token
  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = RefreshBody.parse(req.body);

    let decoded: any;
    try {
      const { pub } = await getKeypair();
      decoded = jwt.verify(refreshToken, pub, { algorithms: ["RS256"] });
    } catch {
      return sendError(reply, "UNAUTHORIZED", "Invalid refresh token");
    }

    if (decoded?.type !== "refresh") return sendError(reply, "UNAUTHORIZED", "Invalid token type");

    // Check if revoked
    const revoked = await prisma.revokedToken.findUnique({
      where: { jti: decoded.jti ?? decoded.sub },
    });
    if (revoked) return sendError(reply, "UNAUTHORIZED", "Token revoked");

    const member = await prisma.orgMember.findFirst({
      where: { userId: decoded.sub, orgId: decoded.org_id },
    });
    if (!member) return sendError(reply, "FORBIDDEN", "Membership not found");

    // Revoke old token
    if (decoded.jti) {
      await prisma.revokedToken.upsert({
        where: { jti: decoded.jti },
        create: { jti: decoded.jti, expiresAt: new Date((decoded.exp ?? 0) * 1000) },
        update: {},
      });
    }

    const tokens = await issueTokens(decoded.sub, decoded.org_id, member.role);
    return tokens;
  });

  // POST /api/auth/logout — revoke refresh token by jti
  app.post("/logout", async (req, reply) => {
    const { refreshToken } = RefreshBody.parse(req.body);

    try {
      const { pub } = await getKeypair();
      const decoded: any = jwt.verify(refreshToken, pub, { algorithms: ["RS256"] });
      if (decoded?.jti) {
        await prisma.revokedToken.upsert({
          where: { jti: decoded.jti },
          create: { jti: decoded.jti, expiresAt: new Date((decoded.exp ?? 0) * 1000) },
          update: {},
        });
      }
    } catch {
      // Ignore errors — logout is idempotent
    }

    reply.code(204);
  });
}
