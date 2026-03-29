import type { FastifyReply } from "fastify";

type ErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "UNPROCESSABLE"
  | "INTERNAL"
  | "BAD_GATEWAY";

const statusMap: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  UNAUTHORIZED: 401,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL: 500,
  BAD_GATEWAY: 502,
};

export function sendError(
  reply: FastifyReply,
  code: ErrorCode,
  message: string,
  details?: unknown,
) {
  return reply.code(statusMap[code]).send({
    error: { code, message, ...(details !== undefined && { details }) },
  });
}
