import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";
import { requireOrg, getOrgId, getUserId } from "../shared/middleware";

const createSkillSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
});

const updateSkillSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export async function skillsRoutes(fastify: FastifyInstance) {
  // All skill routes require org context
  fastify.addHook("preHandler", requireOrg);

  fastify.get("/", async (request, reply) => {
    const orgId = getOrgId(request);
    const skills = await db.skill.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        versions: { where: { isLatest: true }, select: { id: true, version: true, definition: true } },
      },
    });
    return reply.send(skills);
  });

  fastify.post("/", async (request, reply) => {
    const orgId = getOrgId(request);
    const userId = getUserId(request) ?? "unknown";
    const body = createSkillSchema.parse(request.body);
    const skill = await db.skill.create({
      data: { ...body, orgId, authorId: userId },
    });
    return reply.status(201).send(skill);
  });

  fastify.get("/:id", async (request, reply) => {
    const orgId = getOrgId(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const skill = await db.skill.findFirst({
      where: { id, orgId },
      include: { versions: true },
    });
    if (!skill) return reply.status(404).send({ error: "Skill not found" });
    return reply.send(skill);
  });

  fastify.put("/:id", async (request, reply) => {
    const orgId = getOrgId(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = updateSkillSchema.parse(request.body);
    // Ensure the skill belongs to this org
    const existing = await db.skill.findFirst({ where: { id, orgId } });
    if (!existing) return reply.status(404).send({ error: "Skill not found" });
    const skill = await db.skill.update({ where: { id }, data: body });
    return reply.send(skill);
  });

  fastify.delete("/:id", async (request, reply) => {
    const orgId = getOrgId(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const existing = await db.skill.findFirst({ where: { id, orgId } });
    if (!existing) return reply.status(404).send({ error: "Skill not found" });
    await db.skill.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Publish to marketplace
  fastify.post("/:id/publish", async (request, reply) => {
    const orgId = getOrgId(request);
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const existing = await db.skill.findFirst({ where: { id, orgId } });
    if (!existing) return reply.status(404).send({ error: "Skill not found" });
    const skill = await db.skill.update({
      where: { id },
      data: { isPublic: true },
    });
    return reply.send(skill);
  });
}
