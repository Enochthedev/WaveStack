import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import Ajv from "ajv";
import { db } from "../shared/db";
import { SkillExecutor } from "../engine/executor";
import { SkillDefinition } from "../engine/types";
import { enqueueExecution, cancelExecution } from "../shared/queue";
import { requireOrg, requireInternal, getOrgId, getUserId } from "../shared/middleware";
import { sendError } from "../shared/errors";

const ajv = new Ajv({ allErrors: true });

const executeSchema = z.object({
  versionId: z.string().optional(),
  triggeredBy: z.string().optional(),
  triggerType: z.enum(["agent", "user", "schedule"]).default("user"),
  input: z.any().default({}),
  sync: z.boolean().default(false), // true = wait for result; false = return immediately
});

/**
 * Auth hook that accepts EITHER org headers (user/frontend) OR internal service secret (agent-orchestrator).
 */
function requireOrgOrInternal(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const hasOrg = !!req.headers["x-org-id"];
  const hasInternal = !!req.headers["x-internal-service"];

  if (hasOrg) {
    return requireOrg(req, reply, done);
  }
  if (hasInternal) {
    return requireInternal(req, reply, done);
  }
  sendError(reply, "UNAUTHORIZED", "Missing org or internal service context");
}

export async function executeSkillRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireOrgOrInternal);

  fastify.post("/:id/execute", async (request, reply) => {
    const { id: skillId } = z.object({ id: z.string() }).parse(request.params);
    const body = executeSchema.parse(request.body);

    // Resolve orgId — from header (user) or from body (internal service)
    const orgId = getOrgId(request) ?? (body as any).orgId;
    const userId = getUserId(request) ?? body.triggeredBy ?? "system";

    const skill = await db.skill.findUnique({
      where: { id: skillId },
      include: { versions: true },
    });

    if (!skill) return reply.status(404).send({ error: "Skill not found" });

    // Resolve version
    let version = null;
    if (body.versionId) {
      version = skill.versions.find((v: any) => v.id === body.versionId);
    } else {
      version = skill.versions.find((v: any) => v.isLatest);
    }

    if (!version) {
      return reply.status(400).send({ error: "No suitable version found" });
    }

    // Validate input against the skill's inputSchema (if defined)
    const inputSchema = version.inputSchema as Record<string, any>;
    if (inputSchema && typeof inputSchema === "object" && Object.keys(inputSchema).length > 0) {
      const validate = ajv.compile(inputSchema);
      if (!validate(body.input)) {
        return reply.status(400).send({
          error: "Input validation failed",
          details: validate.errors,
        });
      }
    }

    const definition = version.definition as unknown as SkillDefinition;
    const outputMapping = version.outputMapping as Record<string, any> | undefined;

    // Create execution record
    const execution = await db.skillExecution.create({
      data: {
        skillId,
        versionId: version.id,
        orgId: orgId || skill.orgId,
        triggeredBy: userId,
        triggerType: body.triggerType,
        input: body.input || {},
        status: "pending",
        stepResults: [],
      },
    });

    if (body.sync) {
      // Synchronous execution — wait for result (useful for short skills / agent calls)
      const executor = new SkillExecutor();
      const start = Date.now();

      await db.skillExecution.update({
        where: { id: execution.id },
        data: { status: "running" },
      });

      try {
        const result = await executor.execute(definition, body.input, { outputMapping });
        const updated = await db.skillExecution.update({
          where: { id: execution.id },
          data: {
            status: result.status,
            output: result.output || {},
            stepResults: result.results as any,
            durationMs: Date.now() - start,
          },
        });
        return reply.status(200).send(updated);
      } catch (error: any) {
        const updated = await db.skillExecution.update({
          where: { id: execution.id },
          data: {
            status: "failed",
            output: { error: error.message },
            durationMs: Date.now() - start,
          },
        });
        return reply.status(500).send(updated);
      }
    }

    // Async execution — enqueue to BullMQ and return immediately
    await enqueueExecution({
      executionId: execution.id,
      definition,
      input: body.input || {},
      outputMapping,
    });

    return reply.status(202).send(execution);
  });
}

export async function executionsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireOrgOrInternal);

  fastify.get("/", async (request, reply) => {
    const orgId = getOrgId(request);
    // Internal callers must also supply an orgId query param to scope results.
    // Never return cross-tenant data.
    const queryOrgId = orgId ?? (request.query as any).orgId;
    if (!queryOrgId) {
      return sendError(reply, "BAD_REQUEST", "orgId is required");
    }
    const executions = await db.skillExecution.findMany({
      where: { orgId: queryOrgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return reply.send(executions);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const execution = await db.skillExecution.findUnique({ where: { id } });
    if (!execution) return reply.status(404).send({ error: "Execution not found" });

    // Ownership check: ensure the execution belongs to the requesting org
    const orgId = getOrgId(request) ?? (request.query as any).orgId;
    if (orgId && execution.orgId !== orgId) {
      return reply.status(404).send({ error: "Execution not found" });
    }

    return reply.send(execution);
  });

  fastify.post("/:id/cancel", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const orgId = getOrgId(request) ?? (request.query as any).orgId;
    const execution = await db.skillExecution.findUnique({ where: { id } });
    if (!execution) return reply.status(404).send({ error: "Execution not found" });

    // Ownership check
    if (orgId && execution.orgId !== orgId) {
      return reply.status(404).send({ error: "Execution not found" });
    }

    if (execution.status !== "running" && execution.status !== "pending") {
      return reply.status(400).send({ error: `Cannot cancel execution in '${execution.status}' state` });
    }

    // Signal the in-flight worker to abort
    cancelExecution(id);

    const updated = await db.skillExecution.update({
      where: { id },
      data: { status: "cancelled" },
    });
    return reply.send(updated);
  });
}
