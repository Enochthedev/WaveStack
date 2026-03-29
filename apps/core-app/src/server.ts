import "@shared/tracer"; // must be first — patches libs before they load
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { loggerConfig } from "@shared/logger";
import apiRoutes from "@routes/api";
import "@modules/publisher/worker"; // boot worker side-effects
import { getKeypair } from "@modules/auth/keys";
import { env } from "@config/env";
import { prisma } from "@shared/db";

const app = Fastify({
  logger: loggerConfig,
  bodyLimit: 1_048_576, // 1 MB max request body
  requestTimeout: 30_000,
});

// ── Security: CORS ──────────────────────────────────────────────────────────
app.register(cors, {
  origin:
    env.CORS_ORIGINS === "*"
      ? env.NODE_ENV === "production"
        ? false
        : true
      : env.CORS_ORIGINS.split(",").map((o) => o.trim()),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Org-Id",
    "X-User-Id",
    "X-Internal-Service",
    "X-Request-Id",
    "Idempotency-Key",
  ],
  maxAge: 86400,
});

// ── Security: Helmet (HTTP security headers) ────────────────────────────────
app.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// ── Security: Rate limiting ─────────────────────────────────────────────────
app.register(rateLimit, {
  max: env.RATE_LIMIT_POINTS,
  timeWindow: env.RATE_LIMIT_DURATION * 1000,
  allowList: ["127.0.0.1", "::1"],
  keyGenerator: (req) => {
    return (req.headers["x-forwarded-for"] as string) || req.ip;
  },
});

// ── Request ID propagation ──────────────────────────────────────────────────
app.addHook("onRequest", async (req, reply) => {
  const requestId = (req.headers["x-request-id"] as string) || req.id;
  reply.header("X-Request-Id", requestId);
});

// ── JWKS endpoint (must be outside /api prefix) ─────────────────────────────
app.get("/.well-known/jwks.json", async (_req, reply) => {
  const { jwk } = await getKeypair();
  return reply.send({ keys: [jwk] });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.setErrorHandler((error: FastifyError, req, reply) => {
  const requestId = reply.getHeader("X-Request-Id") || req.id;
  const isProd = env.NODE_ENV === "production";

  // Zod validation errors — sanitize details in production
  if (error.name === "ZodError") {
    return reply.code(422).send({
      error: {
        code: "UNPROCESSABLE",
        message: "Validation failed",
        ...(isProd ? {} : { details: error.message }),
        requestId,
      },
    });
  }

  // Prisma not found
  if ((error as any).code === "P2025") {
    return reply
      .code(404)
      .send({ error: { code: "NOT_FOUND", message: "Record not found", requestId } });
  }

  // Prisma unique constraint
  if ((error as any).code === "P2002") {
    return reply
      .code(409)
      .send({ error: { code: "CONFLICT", message: "Record already exists", requestId } });
  }

  // Prisma foreign key violation
  if ((error as any).code === "P2003") {
    return reply
      .code(422)
      .send({ error: { code: "UNPROCESSABLE", message: "Related record not found", requestId } });
  }

  // Prisma value too long
  if ((error as any).code === "P2000") {
    return reply
      .code(400)
      .send({ error: { code: "BAD_REQUEST", message: "Value too long for field", requestId } });
  }

  // Fastify rate limit
  if (error.statusCode === 429) {
    return reply
      .code(429)
      .send({ error: { code: "RATE_LIMITED", message: "Too many requests", requestId } });
  }

  app.log.error({ err: error, requestId }, "Unhandled error");
  return reply.code(500).send({
    error: {
      code: "INTERNAL",
      message: "Internal server error",
      ...(isProd ? {} : { details: error.message }),
      requestId,
    },
  });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.register(apiRoutes, { prefix: "/api" });

// ── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  app.log.info(`Received ${signal}, shutting down gracefully...`);
  try {
    await app.close(); // drains in-flight requests
    await prisma.$disconnect(); // close database pool
    app.log.info("Shutdown complete");
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "Error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Start ────────────────────────────────────────────────────────────────────
app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

export type AppInstance = typeof app;
