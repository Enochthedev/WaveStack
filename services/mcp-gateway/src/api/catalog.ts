/**
 * Marketplace catalog routes.
 *
 * Creators browse integrations and click "Connect" — the backend
 * handles OAuth redirects or API-key credential injection, creates
 * the McpServer record, and connects automatically.
 */
import { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { getCatalog, getIntegration, getCategories } from "../catalog";
import { db } from "../shared/db";
import { redis } from "../shared/redis";
import { sendError } from "../shared/errors";
import { requireOrg, getOrgId, getUserId } from "../shared/middleware";
import { McpManager } from "../mcp/manager";
import { env } from "../config/env";
import { logger } from "../shared/logger";

const OAUTH_STATE_TTL = 600; // 10 minutes

const ConnectApiKeyBody = z.object({
  credentials: z.record(z.string(), z.string()),
});

const OAuthCallbackBody = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Hydrate a config template by replacing {{PLACEHOLDER}} tokens with real values. */
function hydrateConfig(template: Record<string, unknown>, values: Record<string, string>): any {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(template)) {
    if (typeof val === "string") {
      let hydrated = val;
      for (const [token, replacement] of Object.entries(values)) {
        hydrated = hydrated.replace(`{{${token}}}`, replacement);
      }
      result[key] = hydrated;
    } else if (Array.isArray(val)) {
      result[key] = val;
    } else if (typeof val === "object" && val !== null) {
      result[key] = hydrateConfig(val as Record<string, unknown>, values);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export default async function catalogRoutes(app: FastifyInstance) {
  // GET /api/v1/catalog — browse integrations
  app.get("/", async (req) => {
    const category = (req.query as any).category as string | undefined;
    const search = ((req.query as any).search as string | undefined)?.toLowerCase();
    let items = getCatalog(category);
    if (search) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          i.description.toLowerCase().includes(search) ||
          i.tags.some((t) => t.includes(search)),
      );
    }
    return { data: items };
  });

  // GET /api/v1/catalog/categories
  app.get("/categories", async () => {
    return { data: getCategories() };
  });

  // GET /api/v1/catalog/:slug — single integration detail
  app.get<{ Params: { slug: string } }>("/:slug", async (req, reply) => {
    const integration = getIntegration(req.params.slug);
    if (!integration) return sendError(reply, "NOT_FOUND", "Integration not found");
    return integration;
  });

  // POST /api/v1/catalog/:slug/connect — start the connect flow
  app.post<{ Params: { slug: string } }>(
    "/:slug/connect",
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const orgId = getOrgId(req);
      const userId = getUserId(req);
      const integration = getIntegration(req.params.slug);
      if (!integration) return sendError(reply, "NOT_FOUND", "Integration not found");

      // Check if already connected
      const existing = await db.mcpServer.findFirst({
        where: { orgId, slug: integration.slug },
      });
      if (existing && existing.status === "connected") {
        return sendError(reply, "CONFLICT", "Already connected");
      }

      // ── OAuth flow ──
      if (integration.authType === "oauth" && integration.oauth) {
        const state = crypto.randomBytes(24).toString("hex");
        await redis.setex(
          `mcp:oauth:${state}`,
          OAUTH_STATE_TTL,
          JSON.stringify({ orgId, slug: integration.slug, userId }),
        );

        const clientId = process.env[integration.oauth.clientIdEnvVar];
        if (!clientId) {
          return sendError(reply, "UNPROCESSABLE", `OAuth not configured for ${integration.name}`);
        }

        const callbackUrl = env.OAUTH_CALLBACK_URL ?? `${req.protocol}://${req.hostname}/api/v1/catalog/oauth/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: callbackUrl,
          state,
          response_type: "code",
          ...(integration.oauth.scopes.length > 0 && { scope: integration.oauth.scopes.join(" ") }),
        });

        return { type: "oauth", redirectUrl: `${integration.oauth.authorizationUrl}?${params}` };
      }

      // ── API-key flow ──
      if (integration.authType === "api-key") {
        const body = ConnectApiKeyBody.parse(req.body);

        // Verify all required credentials are provided
        for (const field of integration.requiredCredentials ?? []) {
          if (!body.credentials[field]) {
            return sendError(reply, "BAD_REQUEST", `Missing required credential: ${field}`);
          }
        }

        // Map credential keys to template tokens
        const tokenMap: Record<string, string> = {};
        for (const [key, value] of Object.entries(body.credentials)) {
          // Convert camelCase to UPPER_SNAKE for template matching
          const token = key.replace(/([A-Z])/g, "_$1").toUpperCase().replace(/^_/, "");
          tokenMap[token] = value;
        }

        const config = hydrateConfig(integration.configTemplate, tokenMap);

        // Upsert the server record
        const server = await db.mcpServer.upsert({
          where: { slug: `${orgId}-${integration.slug}` },
          create: {
            orgId,
            name: integration.name,
            slug: `${orgId}-${integration.slug}`,
            transport: integration.transport,
            config,
            status: "disconnected",
          },
          update: { config, status: "disconnected" },
        });

        // Connect and discover tools
        try {
          await McpManager.connect(server.id);
          return reply.code(201).send({
            server: { id: server.id, name: server.name, slug: integration.slug, status: "connected" },
          });
        } catch (err: any) {
          logger.error(err, "Failed to connect after API key setup");
          return reply.code(201).send({
            server: { id: server.id, name: server.name, slug: integration.slug, status: "error" },
            warning: "Server created but connection failed — check credentials",
          });
        }
      }

      // ── No-auth flow (public servers) ──
      const config = integration.configTemplate as any;
      const server = await db.mcpServer.upsert({
        where: { slug: `${orgId}-${integration.slug}` },
        create: {
          orgId,
          name: integration.name,
          slug: `${orgId}-${integration.slug}`,
          transport: integration.transport,
          config,
          status: "disconnected",
        },
        update: { config, status: "disconnected" },
      });

      try {
        await McpManager.connect(server.id);
      } catch (err: any) {
        logger.error(err, "Failed to connect public MCP server");
      }

      reply.code(201);
      return { server: { id: server.id, name: server.name, slug: integration.slug, status: server.status } };
    },
  );

  // POST /api/v1/catalog/oauth/callback — handle OAuth code exchange
  app.post("/oauth/callback", async (req, reply) => {
    const { code, state } = OAuthCallbackBody.parse(req.body);

    // Retrieve stored state
    const raw = await redis.get(`mcp:oauth:${state}`);
    if (!raw) return sendError(reply, "BAD_REQUEST", "Invalid or expired OAuth state");
    await redis.del(`mcp:oauth:${state}`);

    const { orgId, slug, userId } = JSON.parse(raw) as { orgId: string; slug: string; userId?: string };
    const integration = getIntegration(slug);
    if (!integration || !integration.oauth) {
      return sendError(reply, "BAD_REQUEST", "Integration not found or not OAuth-based");
    }

    // Exchange code for token
    const clientId = process.env[integration.oauth.clientIdEnvVar];
    const clientSecret = process.env[integration.oauth.clientSecretEnvVar];
    if (!clientId || !clientSecret) {
      return sendError(reply, "INTERNAL", "OAuth not configured on the server");
    }

    const callbackUrl = env.OAUTH_CALLBACK_URL ?? `${req.protocol}://${req.hostname}/api/v1/catalog/oauth/callback`;

    const tokenRes = await fetch(integration.oauth.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      logger.error({ status: tokenRes.status, body: errBody }, "OAuth token exchange failed");
      return sendError(reply, "BAD_REQUEST", "OAuth token exchange failed");
    }

    const tokenData = (await tokenRes.json()) as Record<string, string>;
    const accessToken = tokenData.access_token;
    if (!accessToken) return sendError(reply, "BAD_REQUEST", "No access_token in OAuth response");

    // Hydrate config with the token
    const config = hydrateConfig(integration.configTemplate, { ACCESS_TOKEN: accessToken });

    const server = await db.mcpServer.upsert({
      where: { slug: `${orgId}-${integration.slug}` },
      create: {
        orgId,
        name: integration.name,
        slug: `${orgId}-${integration.slug}`,
        transport: integration.transport,
        config,
        status: "disconnected",
      },
      update: { config, status: "disconnected" },
    });

    try {
      await McpManager.connect(server.id);
    } catch (err: any) {
      logger.error(err, "Failed to connect after OAuth");
    }

    return {
      server: { id: server.id, name: server.name, slug: integration.slug, status: "connected" },
    };
  });

  // DELETE /api/v1/catalog/:slug/disconnect — disconnect an integration
  app.delete<{ Params: { slug: string } }>(
    "/:slug/disconnect",
    { preHandler: [requireOrg] },
    async (req, reply) => {
      const orgId = getOrgId(req);
      const server = await db.mcpServer.findFirst({
        where: { orgId, slug: `${orgId}-${req.params.slug}` },
      });
      if (!server) return sendError(reply, "NOT_FOUND", "Integration not connected");

      await McpManager.disconnect(server.id);
      await db.mcpServer.delete({ where: { id: server.id } });

      reply.code(204);
    },
  );

  // GET /api/v1/catalog/connected — list connected integrations for org
  app.get(
    "/connected",
    { preHandler: [requireOrg] },
    async (req) => {
      const orgId = getOrgId(req);
      const servers = await db.mcpServer.findMany({
        where: { orgId },
        select: { id: true, name: true, slug: true, status: true, lastPingAt: true, _count: { select: { tools: true } } },
        orderBy: { name: "asc" },
      });

      return {
        data: servers.map((s) => ({
          id: s.id,
          name: s.name,
          slug: s.slug.replace(`${orgId}-`, ""),
          status: s.status,
          lastPingAt: s.lastPingAt,
          toolCount: s._count.tools,
        })),
      };
    },
  );
}
