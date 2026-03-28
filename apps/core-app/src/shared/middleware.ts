/**
 * Shared Fastify hooks for auth enforcement, org context, and role-based access.
 */
import type { FastifyRequest, FastifyReply } from "fastify";
import { sendError } from "./errors";

/** Require x-org-id header. Attach orgId to request for downstream use. */
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

/**
 * Require that the caller has one of the allowed roles.
 * Role is set by the auth gateway in the x-scopes header.
 * Falls back to checking x-user-role if present.
 */
export function requireRole(...allowed: string[]) {
  return function (req: FastifyRequest, reply: FastifyReply, done: () => void) {
    const scopes = ((req.headers["x-scopes"] as string) || "").split(",").map((s) => s.trim());
    const role = req.headers["x-user-role"] as string | undefined;

    const hasScope = allowed.some((r) => scopes.includes(r));
    const hasRole = role ? allowed.includes(role) : false;

    if (!hasScope && !hasRole) {
      sendError(reply, "FORBIDDEN", `Requires role: ${allowed.join(" or ")}`);
      return;
    }
    done();
  };
}

/** Require the x-internal-service header matching the secret. */
export function requireInternal(req: FastifyRequest, reply: FastifyReply, done: () => void) {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
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
