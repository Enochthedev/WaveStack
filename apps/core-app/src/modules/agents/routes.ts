/**
 * Agents module — proxy and coordination layer between core-app and agent-orchestrator.
 * core-app owns the approval_requests and agent_tasks records in the DB.
 * agent-orchestrator does the actual agent execution.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "@shared/db";
import { sendError } from "@shared/errors";
import { paginate, PaginationQuery } from "@shared/pagination";
import { publishNotification } from "@modules/notifications/routes";
import { scanForInjection, stripInjectionDelimiters } from "@shared/ai-guard";
import { sanitizeText } from "@shared/sanitize";

const AGENT_RUNTIME_URL = process.env.AGENT_RUNTIME_URL ?? "http://agent-runtime:3300";

const AutonomyBody = z.object({
  agentType: z.string().min(1),
  autonomyLevel: z.enum(["manual", "copilot", "autopilot"]),
  isEnabled: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  allowedSkills: z.array(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
});

const ApprovalBody = z.object({
  status: z.enum(["approved", "rejected"]),
  feedback: z.string().optional(),
});

const ChatBody = z.object({
  message: z.string().min(1).max(8000),
  sessionId: z.string().optional(),
});

const InternalTaskBody = z.object({
  org_id: z.string().min(1),
  agent_type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  urgency: z.enum(["low", "medium", "high"]).default("medium"),
});

export default async function agentsRoutes(app: FastifyInstance) {
  // GET /api/v1/agents/config — get all agent configs for org
  app.get("/v1/agents/config", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const where = { orgId };
    const [configs, total] = await prisma.$transaction([
      prisma.agentConfig.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { agentType: "asc" },
      }),
      prisma.agentConfig.count({ where }),
    ]);
    return paginate(configs, total, q.limit, q.offset);
  });

  // PUT /api/v1/agents/config — upsert agent config
  app.put("/v1/agents/config", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const body = AutonomyBody.parse(req.body);
    const config = await prisma.agentConfig.upsert({
      where: { orgId_agentType: { orgId, agentType: body.agentType } },
      create: { orgId, ...body },
      update: body,
    });
    return config;
  });

  // GET /api/v1/agents/tasks — list agent tasks for org
  app.get("/v1/agents/tasks", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = { ...PaginationQuery.parse(req.query), ...(req.query as any) };
    const status = (req.query as any).status as string | undefined;

    const where = { orgId, ...(status && { status }) };
    const [tasks, total] = await prisma.$transaction([
      prisma.agentTask.findMany({
        where,
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
        include: { approvalRequest: true },
      }),
      prisma.agentTask.count({ where }),
    ]);
    return paginate(tasks, total, q.limit, q.offset);
  });

  // GET /api/v1/agents/approvals — list pending approvals
  app.get("/v1/agents/approvals", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const q = PaginationQuery.parse(req.query);
    const [approvals, total] = await prisma.$transaction([
      prisma.approvalRequest.findMany({
        where: { orgId, status: "pending" },
        take: q.limit,
        skip: q.offset,
        orderBy: { createdAt: "desc" },
        include: { task: { select: { agentType: true, title: true, input: true } } },
      }),
      prisma.approvalRequest.count({ where: { orgId, status: "pending" } }),
    ]);
    return paginate(approvals, total, q.limit, q.offset);
  });

  // POST /api/v1/agents/approvals/:id — approve or reject
  app.post<{ Params: { id: string } }>("/v1/agents/approvals/:id", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    const userId = req.headers["x-user-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const { status, feedback } = ApprovalBody.parse(req.body);
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: req.params.id, orgId },
    });
    if (!approval) return sendError(reply, "NOT_FOUND", "Approval not found");
    if (approval.status !== "pending") return sendError(reply, "CONFLICT", "Already reviewed");
    if (approval.expiresAt < new Date()) {
      await prisma.approvalRequest.update({
        where: { id: req.params.id },
        data: { status: "expired" },
      });
      return sendError(reply, "CONFLICT", "Approval expired");
    }

    const updated = await prisma.approvalRequest.update({
      where: { id: req.params.id },
      data: { status, feedback, reviewedBy: userId ?? null, reviewedAt: new Date() },
    });

    // Forward decision to agent-orchestrator
    try {
      await fetch(`${AGENT_RUNTIME_URL}/internal/approvals/${req.params.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-service": process.env.INTERNAL_SERVICE_SECRET ?? "",
        },
        body: JSON.stringify({ status, feedback, taskId: approval.taskId }),
      });
    } catch (err) {
      app.log.warn({ err }, "Failed to notify agent-orchestrator of approval decision");
    }

    // Log rejection as training signal
    if (status === "rejected" && feedback) {
      const task = await prisma.agentTask.findUnique({ where: { id: approval.taskId } });
      if (task) {
        await prisma.trainingExample.create({
          data: {
            orgId,
            exampleType: "rejection",
            prompt: JSON.stringify(task.input),
            response: JSON.stringify(approval.proposedAction),
            feedback,
            platform: undefined,
          },
        });
      }
    }

    // Publish SSE event
    await publishNotification(orgId, "approval_reviewed", { id: updated.id, status, feedback });

    return updated;
  });

  // POST /api/v1/agents/chat — chat with personal agent (SSE streaming)
  app.post("/v1/agents/chat", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    const userId = req.headers["x-user-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const body = ChatBody.parse(req.body);
    const message = sanitizeText(body.message, 8000);
    const sessionId = body.sessionId;

    // Check for prompt injection / jailbreak attempts
    const guard = scanForInjection(message);
    if (guard.blocked) {
      app.log.warn({ orgId, flags: guard.flags }, "Blocked prompt injection attempt");
      return sendError(reply, "BAD_REQUEST", "Message contains disallowed patterns");
    }
    // For flagged (non-blocking) patterns, strip delimiters and continue
    const cleanMessage = guard.safe ? message : stripInjectionDelimiters(message);

    // Get or create chat session
    let session;
    if (sessionId) {
      session = await prisma.chatSession.findUnique({ where: { id: sessionId, orgId } });
      if (!session) return sendError(reply, "NOT_FOUND", "Session not found");
    } else {
      session = await prisma.chatSession.create({ data: { orgId, userId } });
    }

    // Store user message
    await prisma.chatMessage.create({
      data: { sessionId: session.id, role: "user", content: cleanMessage },
    });

    // Stream from agent-runtime
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.flushHeaders();

    try {
      const upstream = await fetch(`${AGENT_RUNTIME_URL}/v1/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": orgId,
          "x-user-id": userId ?? "",
        },
        body: JSON.stringify({ message: cleanMessage, sessionId: session.id }),
      });

      if (!upstream.ok || !upstream.body) {
        reply.raw.write(
          `event: error\ndata: ${JSON.stringify({ error: "Agent unavailable" })}\n\n`,
        );
        reply.raw.end();
        return reply;
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        reply.raw.write(chunk);
      }

      // Store assistant message
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: "assistant",
          content: fullResponse,
          agentType: "personal",
        },
      });

      reply.raw.write(`event: done\ndata: ${JSON.stringify({ sessionId: session.id })}\n\n`);
    } catch (err) {
      app.log.error({ err }, "Agent chat error");
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: "Internal error" })}\n\n`);
    }

    reply.raw.end();
    return reply;
  });

  // GET /api/v1/agents/chat/sessions — list chat sessions
  app.get("/v1/agents/chat/sessions", async (req, reply) => {
    const orgId = req.headers["x-org-id"] as string;
    const userId = req.headers["x-user-id"] as string;
    if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

    const sessions = await prisma.chatSession.findMany({
      where: { orgId, userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, role: true },
        },
      },
    });
    return sessions;
  });

  // GET /api/v1/agents/chat/sessions/:id/messages — get messages in session
  app.get<{ Params: { id: string } }>(
    "/v1/agents/chat/sessions/:id/messages",
    async (req, reply) => {
      const orgId = req.headers["x-org-id"] as string;
      if (!orgId) return sendError(reply, "UNAUTHORIZED", "Missing org context");

      const session = await prisma.chatSession.findUnique({ where: { id: req.params.id, orgId } });
      if (!session) return sendError(reply, "NOT_FOUND", "Session not found");

      const q = PaginationQuery.parse(req.query);
      const [messages, total] = await prisma.$transaction([
        prisma.chatMessage.findMany({
          where: { sessionId: req.params.id },
          take: q.limit,
          skip: q.offset,
          orderBy: { createdAt: "asc" },
        }),
        prisma.chatMessage.count({ where: { sessionId: req.params.id } }),
      ]);
      return paginate(messages, total, q.limit, q.offset);
    },
  );

  // POST /internal/tasks — internal endpoint for agent-orchestrator to create a task + approval request
  app.post("/internal/tasks", async (req, reply) => {
    const secret = req.headers["x-internal-service"];
    if (secret !== (process.env.INTERNAL_SERVICE_SECRET ?? "dev-internal-secret")) {
      return sendError(reply, "UNAUTHORIZED", "Internal access only");
    }

    const body = InternalTaskBody.parse(req.body);
    const { org_id, agent_type, title, description, payload, urgency } = body;

    // Verify org exists
    const org = await prisma.organization.findUnique({ where: { id: org_id } });
    if (!org) return sendError(reply, "NOT_FOUND", "Organization not found");

    const timeoutHours = parseInt(process.env.APPROVAL_TIMEOUT_HOURS ?? "4", 10);
    const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [task, approval] = await prisma.$transaction(async (tx: any) => {
      const t = await tx.agentTask.create({
        data: {
          orgId: org_id,
          agentType: agent_type,
          title,
          status: "awaiting_approval",
          input: (payload ?? {}) as object,
        },
      });
      const a = await tx.approvalRequest.create({
        data: {
          orgId: org_id,
          taskId: t.id,
          agentType: agent_type,
          title,
          description,
          proposedAction: (payload ?? {}) as object,
          urgency,
          expiresAt,
        },
      });
      return [t, a];
    });

    // Notify connected clients of new approval request
    await publishNotification(org_id, "approval_created", {
      id: approval.id,
      taskId: task.id,
      agentType: agent_type,
      title,
      urgency,
    });

    return reply
      .code(201)
      .send({ task_id: task.id, approval_id: approval.id, status: "awaiting_approval" });
  });
}
