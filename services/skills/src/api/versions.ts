import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";
import { skillDefinitionSchema } from "../engine/validator";
import { requireOrg, getOrgId } from "../shared/middleware";

const createVersionSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semver validation
  definition: z.any().refine((data) => skillDefinitionSchema.safeParse(data).success, {
    message: "Invalid definition schema according to engine rules",
  }),
  inputSchema: z.any().optional(),
  outputMapping: z.any().optional(),
  isLatest: z.boolean().default(true),
});

export async function versionsRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", requireOrg);

  fastify.post("/:id/versions", async (request, reply) => {
    const orgId = getOrgId(request);
    const { id: skillId } = z.object({ id: z.string() }).parse(request.params);

    // Ensure the skill belongs to the caller's org
    const skill = await db.skill.findFirst({ where: { id: skillId, orgId } });
    if (!skill) return reply.status(404).send({ error: "Skill not found" });

    const body = createVersionSchema.parse(request.body);

    if (body.isLatest) {
      await db.skillVersion.updateMany({
        where: { skillId, isLatest: true },
        data: { isLatest: false },
      });
    }
    const version = await db.skillVersion.create({
      data: {
        skillId,
        version: body.version,
        definition: body.definition || { steps: [] },
        inputSchema: body.inputSchema || {},
        outputMapping: body.outputMapping || {},
        isLatest: body.isLatest,
      },
    });

    return reply.status(201).send(version);
  });

  fastify.get("/:id/versions", async (request, reply) => {
    const orgId = getOrgId(request);
    const { id: skillId } = z.object({ id: z.string() }).parse(request.params);
    const skill = await db.skill.findFirst({ where: { id: skillId, orgId } });
    if (!skill) return reply.status(404).send({ error: "Skill not found" });

    const versions = await db.skillVersion.findMany({
      where: { skillId },
      orderBy: { createdAt: "desc" },
    });
    return reply.send(versions);
  });
}
