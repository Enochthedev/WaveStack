/**
 * Agent-type permission matrix for MCP tools.
 * Controls which agent types can call which tools.
 */
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";
import { sendError } from "../shared/errors";
import { requireOrg, getOrgId } from "../shared/middleware";

const SetPermissionBody = z.object({
  toolId: z.string().min(1),
  agentType: z.string().min(1),
  allowed: z.boolean(),
});

const BulkPermissionsBody = z.object({
  permissions: z.array(SetPermissionBody),
});

export default async function permissionsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireOrg);

  // GET /api/v1/permissions/:agentType — get permissions for an agent type
  app.get<{ Params: { agentType: string } }>("/:agentType", async (req) => {
    const orgId = getOrgId(req);
    const permissions = await db.mcpToolPermission.findMany({
      where: {
        agentType: req.params.agentType,
        tool: { server: { orgId } },
      },
      include: {
        tool: {
          select: { id: true, name: true, description: true, server: { select: { name: true, slug: true } } },
        },
      },
    });

    return {
      data: permissions.map((p) => ({
        id: p.id,
        toolId: p.toolId,
        agentType: p.agentType,
        allowed: p.allowed,
        tool: p.tool,
      })),
    };
  });

  // PUT /api/v1/permissions — set/update a single permission
  app.put("/", async (req, reply) => {
    const orgId = getOrgId(req);
    const body = SetPermissionBody.parse(req.body);

    // Verify tool belongs to org
    const tool = await db.mcpTool.findUnique({
      where: { id: body.toolId },
      include: { server: { select: { orgId: true } } },
    });
    if (!tool || tool.server.orgId !== orgId) return sendError(reply, "NOT_FOUND", "Tool not found");

    const permission = await db.mcpToolPermission.upsert({
      where: { toolId_agentType: { toolId: body.toolId, agentType: body.agentType } },
      create: { toolId: body.toolId, agentType: body.agentType, allowed: body.allowed },
      update: { allowed: body.allowed },
    });

    return permission;
  });

  // PUT /api/v1/permissions/bulk — set multiple permissions at once
  app.put("/bulk", async (req, reply) => {
    const orgId = getOrgId(req);
    const { permissions } = BulkPermissionsBody.parse(req.body);

    // Verify all tools belong to org
    const toolIds = [...new Set(permissions.map((p) => p.toolId))];
    const tools = await db.mcpTool.findMany({
      where: { id: { in: toolIds } },
      include: { server: { select: { orgId: true } } },
    });
    const orgToolIds = new Set(tools.filter((t) => t.server.orgId === orgId).map((t) => t.id));
    const invalid = toolIds.filter((id) => !orgToolIds.has(id));
    if (invalid.length > 0) return sendError(reply, "NOT_FOUND", `Tools not found: ${invalid.join(", ")}`);

    const results = await db.$transaction(
      permissions.map((p) =>
        db.mcpToolPermission.upsert({
          where: { toolId_agentType: { toolId: p.toolId, agentType: p.agentType } },
          create: { toolId: p.toolId, agentType: p.agentType, allowed: p.allowed },
          update: { allowed: p.allowed },
        }),
      ),
    );

    return { data: results };
  });
}
