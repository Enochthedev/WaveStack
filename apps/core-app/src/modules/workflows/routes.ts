import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";

const CreateBody = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum(["manual", "schedule", "event"]),
  cronExpr: z.string().optional(),
  eventType: z.string().optional(),
  steps: z.array(z.object({ type: z.string(), config: z.record(z.unknown()) })).min(1),
});

const UpdateBody = CreateBody.partial();

export default async function routes(app: FastifyInstance) {
  // GET /v1/workflows
  app.get("/v1/workflows", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [items, total] = await prisma.$transaction([
      prisma.workflow.findMany({
        where: { orgId },
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
      }),
      prisma.workflow.count({ where: { orgId } }),
    ]);
    return paginate(items, total, q.limit, q.offset);
  });

  // GET /v1/workflows/:id
  app.get<{ Params: { id: string } }>("/v1/workflows/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const wf = await prisma.workflow.findUnique({ where: { id: req.params.id, orgId } });
    if (!wf) return sendError(reply, "NOT_FOUND", "Workflow not found");
    return wf;
  });

  // POST /v1/workflows
  app.post("/v1/workflows", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const data = CreateBody.parse(req.body);
    if (data.trigger === "schedule" && !data.cronExpr) {
      return sendError(reply, "BAD_REQUEST", "cronExpr required for schedule trigger");
    }

    const wf = await prisma.workflow.create({ data: { orgId, ...data, steps: data.steps as any } });
    reply.code(201);
    return wf;
  });

  // PATCH /v1/workflows/:id
  app.patch<{ Params: { id: string } }>("/v1/workflows/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const existing = await prisma.workflow.findUnique({ where: { id: req.params.id, orgId } });
    if (!existing) return sendError(reply, "NOT_FOUND", "Workflow not found");

    const data = UpdateBody.parse(req.body);
    return prisma.workflow.update({ where: { id: req.params.id }, data: data as any });
  });

  // DELETE /v1/workflows/:id
  app.delete<{ Params: { id: string } }>("/v1/workflows/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const existing = await prisma.workflow.findUnique({ where: { id: req.params.id, orgId } });
    if (!existing) return sendError(reply, "NOT_FOUND", "Workflow not found");

    await prisma.workflow.delete({ where: { id: req.params.id } });
    reply.code(204);
  });

  // POST /v1/workflows/:id/run — trigger a manual run
  app.post<{ Params: { id: string } }>("/v1/workflows/:id/run", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const wf = await prisma.workflow.findUnique({ where: { id: req.params.id, orgId } });
    if (!wf) return sendError(reply, "NOT_FOUND", "Workflow not found");

    const run = await prisma.workflowRun.create({
      data: {
        workflowId: wf.id,
        orgId,
        status: "running",
        startedAt: new Date(),
        triggeredBy: "manual",
      },
    });

    // Fire-and-forget simulation — real implementation would enqueue a job
    setImmediate(async () => {
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "done", finishedAt: new Date() },
      });
    });

    reply.code(202);
    return run;
  });

  // GET /v1/workflows/:id/runs — run history
  app.get<{ Params: { id: string } }>("/v1/workflows/:id/runs", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const wf = await prisma.workflow.findUnique({ where: { id: req.params.id, orgId } });
    if (!wf) return sendError(reply, "NOT_FOUND", "Workflow not found");

    const q = PaginationQuery.parse(req.query);
    const [items, total] = await prisma.$transaction([
      prisma.workflowRun.findMany({
        where: { workflowId: req.params.id },
        take: q.limit,
        skip: q.offset,
        orderBy: { startedAt: "desc" },
      }),
      prisma.workflowRun.count({ where: { workflowId: req.params.id } }),
    ]);
    return paginate(items, total, q.limit, q.offset);
  });
}
