import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";

const createSkillSchema = z.object({
  orgId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  category: z.string(),
  authorId: z.string(),
});

const updateSkillSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export async function skillsRoutes(fastify: FastifyInstance) {
  fastify.get("/", async (request, reply) => {
    const skills = await db.skill.findMany({
      orderBy: { createdAt: "desc" },
    });
    return reply.send(skills);
  });

  fastify.post("/", async (request, reply) => {
    const body = createSkillSchema.parse(request.body);
    const skill = await db.skill.create({
      data: body,
    });
    return reply.status(201).send(skill);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const skill = await db.skill.findUnique({
      where: { id },
      include: { versions: true },
    });
    if (!skill) return reply.status(404).send({ error: "Skill not found" });
    return reply.send(skill);
  });

  fastify.put("/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = updateSkillSchema.parse(request.body);
    const skill = await db.skill.update({
      where: { id },
      data: body,
    });
    return reply.send(skill);
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    await db.skill.delete({ where: { id } });
    return reply.status(204).send();
  });

  // Publish to marketplace
  fastify.post("/:id/publish", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const skill = await db.skill.update({
      where: { id },
      data: { isPublic: true },
    });
    return reply.send(skill);
  });
}
