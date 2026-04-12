import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";
import { requireOrg, getOrgId, getUserId } from "../shared/middleware";

const rateSkillSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});

export async function marketplaceRoutes(fastify: FastifyInstance) {
  // Browse is public — no auth required
  fastify.get("/", async (request, reply) => {
    const { category } = z.object({ category: z.string().optional() }).parse(request.query);
    const whereClause: any = { isPublic: true };
    if (category) {
      whereClause.category = category;
    }

    const publicSkills = await db.skill.findMany({
      where: whereClause,
      orderBy: { installCount: "desc" },
      include: {
        versions: {
          where: { isLatest: true },
          select: { id: true, version: true, definition: true },
        },
      },
    });

    // Compute stepsCount + avg rating for each skill
    const result = publicSkills.map((s) => {
      const latestDef = s.versions[0]?.definition as any;
      const stepsCount = Array.isArray(latestDef?.steps) ? latestDef.steps.length : 0;
      const rating = s.ratingCount > 0 ? s.ratingSum / s.ratingCount : 0;
      return { ...s, stepsCount, rating };
    });

    return reply.send(result);
  });

  // Install, fork, and rate require org context
  fastify.post("/:id/install", { preHandler: requireOrg }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const orgId = getOrgId(request);
    const userId = getUserId(request) ?? "unknown";

    const targetSkill = await db.skill.findUnique({
      where: { id },
      include: { versions: { where: { isLatest: true } } },
    });
    if (!targetSkill || !targetSkill.isPublic) {
      return reply.status(404).send({ error: "Skill not found" });
    }

    // Copy the skill into the caller's org + increment install count
    const installed = await db.$transaction(async (tx) => {
      await tx.skill.update({
        where: { id },
        data: { installCount: { increment: 1 } },
      });

      const newSkill = await tx.skill.create({
        data: {
          orgId,
          authorId: userId,
          name: targetSkill.name,
          slug: `${targetSkill.slug}-${orgId.slice(-6)}`,
          description: targetSkill.description,
          category: targetSkill.category,
          forkedFromId: targetSkill.id,
        },
      });

      if (targetSkill.versions.length > 0) {
        const v = targetSkill.versions[0];
        await tx.skillVersion.create({
          data: {
            skillId: newSkill.id,
            version: v.version,
            definition: v.definition || {},
            inputSchema: v.inputSchema || {},
            outputMapping: v.outputMapping || {},
            isLatest: true,
          },
        });
      }

      return newSkill;
    });

    return reply.status(201).send(installed);
  });

  fastify.post("/:id/fork", { preHandler: requireOrg }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const orgId = getOrgId(request);
    const userId = getUserId(request) ?? "unknown";

    const sourceSkill = await db.skill.findUnique({
      where: { id },
      include: { versions: { where: { isLatest: true } } },
    });

    if (!sourceSkill) return reply.status(404).send({ error: "Source skill not found" });

    const newSkill = await db.skill.create({
      data: {
        orgId,
        authorId: userId,
        name: `${sourceSkill.name} (Forked)`,
        slug: `${sourceSkill.slug}-fork-${Date.now()}`,
        description: sourceSkill.description,
        category: sourceSkill.category,
        forkedFromId: sourceSkill.id,
      },
    });

    if (sourceSkill.versions.length > 0) {
      const v = sourceSkill.versions[0];
      await db.skillVersion.create({
        data: {
          skillId: newSkill.id,
          version: v.version,
          definition: v.definition || {},
          inputSchema: v.inputSchema || {},
          outputMapping: v.outputMapping || {},
          isLatest: true,
        },
      });
    }

    return reply.status(201).send(newSkill);
  });

  fastify.post("/:id/rate", { preHandler: requireOrg }, async (request, reply) => {
    const { id: skillId } = z.object({ id: z.string() }).parse(request.params);
    const userId = getUserId(request);
    if (!userId) return reply.status(401).send({ error: "User context required to rate" });

    const body = rateSkillSchema.parse(request.body);

    await db.$transaction(async (tx) => {
      await tx.skillRating.upsert({
        where: { skillId_userId: { skillId, userId } },
        update: { rating: body.rating, review: body.review },
        create: { skillId, userId, rating: body.rating, review: body.review },
      });

      const agg = await tx.skillRating.aggregate({
        where: { skillId },
        _sum: { rating: true },
        _count: { rating: true },
      });

      await tx.skill.update({
        where: { id: skillId },
        data: {
          ratingSum: agg._sum.rating || 0,
          ratingCount: agg._count.rating || 0,
        },
      });
    });

    return reply.status(201).send({ success: true, message: "Skill rated" });
  });
}
