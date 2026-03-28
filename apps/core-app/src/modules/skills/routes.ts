/**
 * Skills proxy — forwards /v1/skills/* and /v1/marketplace/* to the skills service.
 * Auth headers (x-org-id, x-user-id, x-internal-service) are passed through.
 */
import type { FastifyPluginAsync } from "fastify";
import { env } from "@config/env";

const SKILLS_URL = env.SKILLS_SERVICE_URL;

async function proxyToSkills(
  method: string,
  backendPath: string,
  headers: Record<string, string | undefined>,
  body?: unknown,
) {
  const url = `${SKILLS_URL}${backendPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers["x-org-id"] && { "x-org-id": headers["x-org-id"] }),
      ...(headers["x-user-id"] && { "x-user-id": headers["x-user-id"] }),
      ...(headers["x-internal-service"] && { "x-internal-service": headers["x-internal-service"] }),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  return { status: res.status, data };
}

const skillsRoutes: FastifyPluginAsync = async (app) => {
  // ── Skills CRUD (/v1/skills) ───────────────────────────────────────────────
  app.get("/v1/skills", async (req, reply) => {
    const qs = req.url.split("?")[1] || "";
    const { status, data } = await proxyToSkills(
      "GET",
      `/api/v1/skills${qs ? `?${qs}` : ""}`,
      req.headers as any,
    );
    return reply.status(status).send(data);
  });

  app.post("/v1/skills", async (req, reply) => {
    const { status, data } = await proxyToSkills(
      "POST",
      "/api/v1/skills",
      req.headers as any,
      req.body,
    );
    return reply.status(status).send(data);
  });

  app.get("/v1/skills/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills("GET", `/api/v1/skills/${id}`, req.headers as any);
    return reply.status(status).send(data);
  });

  app.put("/v1/skills/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "PUT",
      `/api/v1/skills/${id}`,
      req.headers as any,
      req.body,
    );
    return reply.status(status).send(data);
  });

  app.delete("/v1/skills/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "DELETE",
      `/api/v1/skills/${id}`,
      req.headers as any,
    );
    return reply.status(status).send(data);
  });

  // ── Versions ───────────────────────────────────────────────────────────────
  app.post("/v1/skills/:id/versions", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "POST",
      `/api/v1/skills/${id}/versions`,
      req.headers as any,
      req.body,
    );
    return reply.status(status).send(data);
  });

  app.get("/v1/skills/:id/versions", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "GET",
      `/api/v1/skills/${id}/versions`,
      req.headers as any,
    );
    return reply.status(status).send(data);
  });

  // ── Execution ──────────────────────────────────────────────────────────────
  app.post("/v1/skills/:id/execute", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "POST",
      `/api/v1/skills/${id}/execute`,
      req.headers as any,
      req.body,
    );
    return reply.status(status).send(data);
  });

  // ── Executions listing ─────────────────────────────────────────────────────
  app.get("/v1/executions", async (req, reply) => {
    const qs = req.url.split("?")[1] || "";
    const { status, data } = await proxyToSkills(
      "GET",
      `/api/v1/executions${qs ? `?${qs}` : ""}`,
      req.headers as any,
    );
    return reply.status(status).send(data);
  });

  app.get("/v1/executions/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "GET",
      `/api/v1/executions/${id}`,
      req.headers as any,
    );
    return reply.status(status).send(data);
  });

  app.post("/v1/executions/:id/cancel", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "POST",
      `/api/v1/executions/${id}/cancel`,
      req.headers as any,
    );
    return reply.status(status).send(data);
  });

  // ── Publish ────────────────────────────────────────────────────────────────
  app.post("/v1/skills/:id/publish", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "POST",
      `/api/v1/skills/${id}/publish`,
      req.headers as any,
    );
    return reply.status(status).send(data);
  });

  // ── Marketplace ────────────────────────────────────────────────────────────
  app.get("/v1/marketplace", async (req, reply) => {
    const qs = req.url.split("?")[1] || "";
    const { status, data } = await proxyToSkills(
      "GET",
      `/api/v1/marketplace${qs ? `?${qs}` : ""}`,
      req.headers as any,
    );
    return reply.status(status).send(data);
  });

  app.post("/v1/marketplace/:id/install", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "POST",
      `/api/v1/marketplace/${id}/install`,
      req.headers as any,
      req.body,
    );
    return reply.status(status).send(data);
  });

  app.post("/v1/marketplace/:id/fork", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "POST",
      `/api/v1/marketplace/${id}/fork`,
      req.headers as any,
      req.body,
    );
    return reply.status(status).send(data);
  });

  app.post("/v1/marketplace/:id/rate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, data } = await proxyToSkills(
      "POST",
      `/api/v1/marketplace/${id}/rate`,
      req.headers as any,
      req.body,
    );
    return reply.status(status).send(data);
  });
};

export default skillsRoutes;
