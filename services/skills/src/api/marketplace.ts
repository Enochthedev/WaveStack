import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../shared/db";

const installSkillSchema = z.object({
  orgId: z.string(),
  authorId: z.string(),
});

const rateSkillSchema = z.object({
  userId: z.string(),
  rating: z.number().min(1).max(5),
  review: z.string().optional(),
});

export async function marketplaceRoutes(fastify: FastifyInstance) {
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
          select: { version: true }
        }
      }
    });

    return reply.send(publicSkills);
  });

  fastify.post("/:id/install", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = installSkillSchema.parse(request.body);

    const targetSkill = await db.skill.findUnique({ where: { id } });
    if (!targetSkill) return reply.status(404).send({ error: "Skill not found" });

    // Assuming installation means bumping the installCount.
    // In a real system, we might copy the skill over to the org. Let's do a simple counter increment for now.
    await db.skill.update({
      where: { id },
      data: { installCount: { increment: 1 } },
    });

    return reply.send({ success: true, message: "Skill installed" });
  });

  fastify.post("/:id/fork", async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const body = installSkillSchema.parse(request.body);

    const sourceSkill = await db.skill.findUnique({
      where: { id },
      include: { versions: { where: { isLatest: true } } }
    });
    
    if (!sourceSkill) return reply.status(404).send({ error: "Source skill not found" });

    // Create new skill
    const newSkill = await db.skill.create({
      data: {
        orgId: body.orgId,
        authorId: body.authorId,
        name: `${sourceSkill.name} (Forked)`,
        slug: `${sourceSkill.slug}-fork-${Date.now()}`,
        description: sourceSkill.description,
        category: sourceSkill.category,
        forkedFromId: sourceSkill.id,
      }
    });

    // Copy latest version
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
        }
      });
    }

    return reply.status(201).send(newSkill);
  });

  fastify.post("/:id/rate", async (request, reply) => {
    const { id: skillId } = z.object({ id: z.string() }).parse(request.params);
    const body = rateSkillSchema.parse(request.body);

    await db.$transaction(async (tx) => {
      // Upsert rating
      const rating = await tx.skillRating.upsert({
        where: { skillId_userId: { skillId, userId: body.userId } },
        update: { rating: body.rating, review: body.review },
        create: {
          skillId,
          userId: body.userId,
          rating: body.rating,
          review: body.review,
        },
      });

      // Recalculate sums
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
