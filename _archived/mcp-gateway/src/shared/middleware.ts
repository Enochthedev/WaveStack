import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from "fastify";
import { env } from "../config/env";
import { sendError } from "./errors";

export function requireOrg(req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
  const orgId = req.headers["x-org-id"];
  if (!orgId) {
    sendError(reply, "UNAUTHORIZED", "Missing org context");
    return;
  }
  done();
}

export function requireInternal(req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
  const secret = req.headers["x-internal-service"];
  if (secret !== env.INTERNAL_SERVICE_SECRET) {
    sendError(reply, "FORBIDDEN", "Internal access only");
    return;
  }
  done();
}

export function requireOrgOrInternal(req: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) {
  const orgId = req.headers["x-org-id"];
  const secret = req.headers["x-internal-service"];
  if (!orgId && secret !== env.INTERNAL_SERVICE_SECRET) {
    sendError(reply, "UNAUTHORIZED", "Missing org or internal context");
    return;
  }
  done();
}

export function getOrgId(req: FastifyRequest): string {
  return req.headers["x-org-id"] as string;
}

export function getUserId(req: FastifyRequest): string | undefined {
  return req.headers["x-user-id"] as string | undefined;
}
