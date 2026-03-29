import { FastifyReply } from "fastify";

type ErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "INTERNAL";

const statusMap: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
};

export function sendError(
  reply: FastifyReply,
  code: ErrorCode,
  message: string,
  details?: unknown,
) {
  const status = statusMap[code];
  const body: Record<string, unknown> = { error: code, message };
  if (details) body.details = details;
  return reply.status(status).send(body);
}
