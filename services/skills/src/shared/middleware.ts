import { FastifyRequest, FastifyReply } from "fastify";
import { sendError } from "./errors";
import { env } from "../config/env";

/** Require x-org-id header. */
export function requireOrg(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const orgId = req.headers["x-org-id"] as string | undefined;
  if (!orgId) {
    sendError(reply, "UNAUTHORIZED", "Missing org context");
    return;
  }
  done();
}

/** Require x-user-id header. */
export function requireUser(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const userId = req.headers["x-user-id"] as string | undefined;
  if (!userId) {
    sendError(reply, "UNAUTHORIZED", "Missing user context");
    return;
  }
  done();
}

/** Require the x-internal-service header matching the secret. */
export function requireInternal(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const secret = env.INTERNAL_SERVICE_SECRET;
  if (!secret || req.headers["x-internal-service"] !== secret) {
    sendError(reply, "FORBIDDEN", "Internal use only");
    return;
  }
  done();
}

/** Helper to extract orgId from request headers. */
export function getOrgId(req: FastifyRequest): string {
  return req.headers["x-org-id"] as string;
}

/** Helper to extract userId from request headers. */
export function getUserId(req: FastifyRequest): string | undefined {
  return req.headers["x-user-id"] as string | undefined;
}
