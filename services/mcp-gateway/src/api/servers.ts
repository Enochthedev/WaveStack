/**
 * Server management routes — CRUD for MCP server connections.
 * This is the "advanced mode" for power users who want to
 * manually register MCP servers beyond the curated catalog.
 */
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";
import { sendError } from "../shared/errors";
import { requireOrgOrInternal, getOrgId } from "../shared/middleware";
import { McpManager } from "../mcp/manager";
import { stdioConfigSchema, sseConfigSchema, httpConfigSchema } from "../mcp/types";

const CreateServerBody = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  transport: z.enum(["stdio", "sse", "http"]),
  config: z.any(),
});

const UpdateServerBody = z.object({
  name: z.string().min(1).max(100).optional(),
  config: z.any().optional(),
});

/** Validate config against the appropriate transport schema — returns as `any` for Prisma JSON compat. */
function validateConfig(transport: string, config: unknown): any {
  switch (transport) {
    case "stdio": return stdioConfigSchema.parse(config);
    case "sse":   return sseConfigSchema.parse(config);
    case "http":  return httpConfigSchema.parse(config);
    default: throw new Error(`Unknown transport: ${transport}`);
  }
}

export default async function serversRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOrgOrInternal);

  // GET /api/v1/servers — list all servers for org
  app.get("/", async (req) => {
    const orgId = getOrgId(req);
    const servers = await db.mcpServer.findMany({
      where: { orgId },
      include: { _count: { select: { tools: true } } },
      orderBy: { name: "asc" },
    });

    return {
      data: servers.map((s) => {
        const liveConn = McpManager.getConnection(s.id);
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          transport: s.transport,
          status: liveConn?.status ?? s.status,
          lastPingAt: s.lastPingAt,
          toolCount: s._count.tools,
        };
      }),
    };
  });

  // POST /api/v1/servers — register a new server manually
  app.post("/", async (req, reply) => {
    const orgId = getOrgId(req);
    const body = CreateServerBody.parse(req.body);
    const config = validateConfig(body.transport, body.config);

    const existing = await db.mcpServer.findUnique({ where: { slug: body.slug } });
    if (existing) return sendError(reply, "CONFLICT", "Server slug already taken");

    const server = await db.mcpServer.create({
      data: {
        orgId,
        name: body.name,
        slug: body.slug,
        transport: body.transport,
        config,
        status: "disconnected",
      },
    });

    reply.code(201);
    return server;
  });

  // GET /api/v1/servers/:id — server detail with tools
  app.get<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const orgId = getOrgId(req);
    const server = await db.mcpServer.findUnique({
      where: { id: req.params.id },
      include: { tools: { where: { isEnabled: true }, orderBy: { name: "asc" } } },
    });
    if (!server || server.orgId !== orgId) return sendError(reply, "NOT_FOUND", "Server not found");

    const liveConn = McpManager.getConnection(server.id);
    return { ...server, liveStatus: liveConn?.status ?? server.status };
  });

  // PUT /api/v1/servers/:id — update server config
  app.put<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const orgId = getOrgId(req);
    const server = await db.mcpServer.findUnique({ where: { id: req.params.id } });
    if (!server || server.orgId !== orgId) return sendError(reply, "NOT_FOUND", "Server not found");

    const body = UpdateServerBody.parse(req.body);
    const config = body.config ? validateConfig(server.transport, body.config) : undefined;

    const updated = await db.mcpServer.update({
      where: { id: req.params.id },
      data: { ...(body.name && { name: body.name }), ...(config && { config }) },
    });
    return updated;
  });

  // DELETE /api/v1/servers/:id — disconnect and remove
  app.delete<{ Params: { id: string } }>("/:id", async (req, reply) => {
    const orgId = getOrgId(req);
    const server = await db.mcpServer.findUnique({ where: { id: req.params.id } });
    if (!server || server.orgId !== orgId) return sendError(reply, "NOT_FOUND", "Server not found");

    await McpManager.disconnect(server.id);
    await db.mcpServer.delete({ where: { id: server.id } });
    reply.code(204);
  });

  // POST /api/v1/servers/:id/connect
  app.post<{ Params: { id: string } }>("/:id/connect", async (req, reply) => {
    const orgId = getOrgId(req);
    const server = await db.mcpServer.findUnique({ where: { id: req.params.id } });
    if (!server || server.orgId !== orgId) return sendError(reply, "NOT_FOUND", "Server not found");

    try {
      const conn = await McpManager.connect(server.id);
      return { status: conn.status };
    } catch (err: any) {
      return sendError(reply, "UNPROCESSABLE", err.message ?? "Connection failed");
    }
  });

  // POST /api/v1/servers/:id/disconnect
  app.post<{ Params: { id: string } }>("/:id/disconnect", async (req, reply) => {
    const orgId = getOrgId(req);
    const server = await db.mcpServer.findUnique({ where: { id: req.params.id } });
    if (!server || server.orgId !== orgId) return sendError(reply, "NOT_FOUND", "Server not found");

    await McpManager.disconnect(server.id);
    return { status: "disconnected" };
  });

  // POST /api/v1/servers/:id/sync — force re-discovery of tools
  app.post<{ Params: { id: string } }>("/:id/sync", async (req, reply) => {
    const orgId = getOrgId(req);
    const server = await db.mcpServer.findUnique({ where: { id: req.params.id } });
    if (!server || server.orgId !== orgId) return sendError(reply, "NOT_FOUND", "Server not found");

    const conn = McpManager.getConnection(server.id);
    if (!conn || conn.status !== "connected") {
      return sendError(reply, "UNPROCESSABLE", "Server must be connected to sync tools");
    }

    await McpManager.syncTools(server.id, conn.client);
    const tools = await db.mcpTool.findMany({ where: { serverId: server.id, isEnabled: true } });
    return { synced: tools.length, tools: tools.map((t) => ({ id: t.id, name: t.name, description: t.description })) };
  });
}
