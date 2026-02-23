import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";
import { SkillExecutor } from "../engine/executor";
import { SkillDefinition } from "../engine/types";

const executeSchema = z.object({
  versionId: z.string().optional(),
  orgId: z.string(),
  triggeredBy: z.string(),
  triggerType: z.enum(["agent", "user", "schedule"]),
  input: z.any().default({}),
});

export async function executeSkillRoutes(fastify: FastifyInstance) {
  const executor = new SkillExecutor();

  fastify.post("/:id/execute", async (request, reply) => {
    const { id: skillId } = z.object({ id: z.string() }).parse(request.params);
    const body = executeSchema.parse(request.body);

    const skill = await db.skill.findUnique({
      where: { id: skillId },
      include: { versions: true }
    });

    if (!skill) return reply.status(404).send({ error: "Skill not found" });

    let version = null;
    if (body.versionId) {
      version = skill.versions.find((v: any) => v.id === body.versionId);
    } else {
      version = skill.versions.find((v: any) => v.isLatest);
    }

    if (!version) {
      return reply.status(400).send({ error: "Suitable version not found" });
    }

    // Create execution record
    const execution = await db.skillExecution.create({
      data: {
        skillId,
        versionId: version.id,
        orgId: body.orgId,
        triggeredBy: body.triggeredBy,
        triggerType: body.triggerType,
        input: body.input || {},
        status: "running",
        stepResults: [],
      }
    });

    // Run execution in background (we don't wait for it unless it's a short script)
    // For this simple example, we await it, but production might enqueue to Redis.
    const start = Date.now();
    try {
      const result = await executor.execute(version.definition as unknown as SkillDefinition, body.input);
      
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
  });
}

export async function executionsRoutes(fastify: FastifyInstance) {

  fastify.get("/", async (request, reply) => {
    const { orgId } = z.object({ orgId: z.string().optional() }).parse(request.query);
    const whereClause = orgId ? { orgId } : {};
    
    const executions = await db.skillExecution.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });
    return reply.send(executions);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const execution = await db.skillExecution.findUnique({
      where: { id }
    });
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    return reply.send(execution);
  });

  fastify.post("/:id/cancel", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const execution = await db.skillExecution.update({
      where: { id },
      data: { status: "cancelled" }
    });
    return reply.send(execution);
  });
}
