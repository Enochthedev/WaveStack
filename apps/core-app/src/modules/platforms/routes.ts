/**
 * Platform Credentials module
 * Handles storing and refreshing OAuth tokens for connected platforms.
 * Tokens are AES-256-GCM encrypted at the application layer before DB storage.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const PLATFORMS = [
  "twitch",
  "youtube",
  "tiktok",
  "instagram",
  "twitter",
  "discord",
  "facebook",
  "linkedin",
  "kick",
  "spotify",
  "patreon",
  "streamlabs",
  "streamelements",
] as const;

type Platform = (typeof PLATFORMS)[number];

const ConnectBody = z.object({
  platform: z.enum(PLATFORMS),
  accountId: z.string().min(1),
  accountHandle: z.string().optional(),
  accountAvatarUrl: z.string().url().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  scope: z.array(z.string()).default([]),
});

// AES-256-GCM encryption for token storage
const ENCRYPTION_KEY = Buffer.from(
  process.env.TOKEN_ENCRYPTION_KEY ||
    "0000000000000000000000000000000000000000000000000000000000000000",
  "hex",
);

function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final("utf8");
}

export default async function platformsRoutes(app: FastifyInstance) {
  // GET /api/v1/platforms — list all connected platforms for org
  app.get("/v1/platforms", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const where = { orgId };
    const [creds, total] = await prisma.$transaction([
      prisma.platformCredential.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        select: {
          id: true,
          platform: true,
          accountId: true,
          accountHandle: true,
          accountAvatarUrl: true,
          scope: true,
          status: true,
          tokenExpiresAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { platform: "asc" },
      }),
      prisma.platformCredential.count({ where }),
    ]);
    return paginate(creds, total, q.limit, q.offset);
  });

  // GET /api/v1/platforms/:platform/status — check token health
  app.get<{ Params: { platform: string } }>(
    "/v1/platforms/:platform/status",
    async (req, reply) => {
      const orgId = req.headers["x-org-id"] as string;
      if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

      const cred = await prisma.platformCredential.findFirst({
        where: { orgId, platform: req.params.platform },
        select: { status: true, tokenExpiresAt: true, accountHandle: true },
      });
      if (!cred) return { connected: false, status: "disconnected" };

      const expired = cred.tokenExpiresAt ? cred.tokenExpiresAt < new Date() : false;
      return {
        connected: true,
        status: expired ? "expired" : cred.status,
        accountHandle: cred.accountHandle,
        tokenExpiresAt: cred.tokenExpiresAt,
      };
    },
  );

  // POST /api/v1/platforms/connect — store platform credentials (called after OAuth callback)
  app.post("/v1/platforms/connect", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const body = ConnectBody.parse(req.body);
    const encryptedAccess = encrypt(body.accessToken);
    const encryptedRefresh = body.refreshToken ? encrypt(body.refreshToken) : null;

    const cred = await prisma.platformCredential.upsert({
      where: {
        orgId_platform_accountId: { orgId, platform: body.platform, accountId: body.accountId },
      },
      create: {
        orgId,
        platform: body.platform,
        accountId: body.accountId,
        accountHandle: body.accountHandle,
        accountAvatarUrl: body.accountAvatarUrl,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
        scope: body.scope,
        status: "active",
      },
      update: {
        accountHandle: body.accountHandle,
        accountAvatarUrl: body.accountAvatarUrl,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiresAt: body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
        scope: body.scope,
        status: "active",
      },
      select: { id: true, platform: true, accountHandle: true, status: true },
    });

    reply.code(201);
    return cred;
  });

  // DELETE /api/v1/platforms/:platform — disconnect platform
  app.delete<{ Params: { platform: string } }>("/v1/platforms/:platform", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const deleted = await prisma.platformCredential.deleteMany({
      where: { orgId, platform: req.params.platform },
    });
    if (deleted.count === 0) return sendError(reply, "NOT_FOUND", "Platform not connected");
    reply.code(204);
  });

  // GET /v1/internal/platforms/accounts?platform=twitch — list all active accounts for a platform
  // Used by bots/services to discover which orgs they should be serving.
  // Requires x-internal-service header — never exposed externally.
  app.get("/v1/internal/platforms/accounts", async (req, reply) => {
    const isInternal = req.headers["x-internal-service"] === process.env.INTERNAL_SERVICE_SECRET;
    if (!isInternal) return sendError(reply, "FORBIDDEN", "Internal use only");

    const { platform } = req.query as { platform?: string };
    if (!platform) return sendError(reply, "BAD_REQUEST", "platform query param required");
    if (!PLATFORMS.includes(platform as Platform))
      return sendError(reply, "BAD_REQUEST", "Invalid platform");

    const q = PaginationQuery.parse(req.query);
    const creds = await prisma.platformCredential.findMany({
      where: { platform, status: "active" },
      take: q.limit,
      skip: q.offset,
      select: {
        orgId: true,
        accountId: true,
        accountHandle: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true,
        scope: true,
      },
    });

    return creds.map((c) => ({
      orgId: c.orgId,
      accountId: c.accountId,
      accountHandle: c.accountHandle,
      accessToken: decrypt(c.accessToken),
      refreshToken: c.refreshToken ? decrypt(c.refreshToken) : null,
      tokenExpiresAt: c.tokenExpiresAt,
      scope: c.scope,
    }));
  });

  // GET /api/v1/platforms/:platform/token — get decrypted token (internal use only, not exposed externally)
  app.get<{ Params: { platform: Platform } }>(
    "/v1/platforms/:platform/token",
    async (req, reply) => {
      const orgId = req.headers["x-org-id"] as string;
      if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

      // Only accessible from internal services (check for internal header)
      const isInternal = req.headers["x-internal-service"] === process.env.INTERNAL_SERVICE_SECRET;
      if (!isInternal) return sendError(reply, "FORBIDDEN", "Internal use only");

      const cred = await prisma.platformCredential.findFirst({
        where: { orgId, platform: req.params.platform, status: "active" },
      });
      if (!cred) return sendError(reply, "NOT_FOUND", "No active credentials for platform");

      return {
        accessToken: decrypt(cred.accessToken),
        refreshToken: cred.refreshToken ? decrypt(cred.refreshToken) : null,
        tokenExpiresAt: cred.tokenExpiresAt,
        scope: cred.scope,
      };
    },
  );
}
