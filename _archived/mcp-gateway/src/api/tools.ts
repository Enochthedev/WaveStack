/**
 * Tool discovery and invocation routes.
 * Called by the frontend (browsing) and agent-orchestrator (executing).
 */
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";
import { sendError } from "../shared/errors";
import { requireOrgOrInternal, getOrgId, getUserId } from "../shared/middleware";
import { McpRouter } from "../mcp/router";

const CallToolBody = z.object({
  serverId: z.string().min(1),
  toolName: z.string().min(1),
  input: z.any().default({}),
  callerType: z.enum(["agent", "skill", "user"]).default("user"),
});

export default async function toolsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOrgOrInternal);

  // GET /api/v1/tools — list all tools across the org's connected servers
  app.get("/", async (req) => {
    const orgId = getOrgId(req);
    const search = ((req.query as any).search as string | undefined)?.toLowerCase();
    const serverId = (req.query as any).serverId as string | undefined;

    const where: any = { server: { orgId }, isEnabled: true };
    if (serverId) where.serverId = serverId;

    const tools = await db.mcpTool.findMany({
      where,
      include: { server: { select: { id: true, name: true, slug: true, status: true } } },
      orderBy: { name: "asc" },
    });

    let result = tools.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      server: t.server,
    }));

    if (search) {
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          (t.description?.toLowerCase().includes(search) ?? false),
      );
    }

    return { data: result };
  });

  // POST /api/v1/tools/call — invoke a tool
  app.post("/call", async (req, reply) => {
    const body = CallToolBody.parse(req.body);
    const callerId = getUserId(req) ?? (req.headers["x-internal-service"] as string) ?? "anonymous";

    // Verify the server belongs to the caller's org
    const orgId = getOrgId(req);
    if (orgId) {
      const server = await db.mcpServer.findUnique({ where: { id: body.serverId } });
      if (!server || server.orgId !== orgId) {
        return sendError(reply, "NOT_FOUND", "Server not found");
      }
    }

    try {
      const result = await McpRouter.callTool(
        body.serverId,
        body.toolName,
        body.input,
        callerId,
        body.callerType,
      );
      return { data: result };
    } catch (err: any) {
      if (err.message?.includes("not found")) return sendError(reply, "NOT_FOUND", err.message);
      if (err.message?.includes("permission")) return sendError(reply, "FORBIDDEN", err.message);
      if (err.message?.includes("not connected")) return sendError(reply, "UNPROCESSABLE", err.message);
      return sendError(reply, "INTERNAL", err.message ?? "Tool call failed");
    }
  });
}
