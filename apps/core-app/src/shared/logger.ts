import pino from "pino";

const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "password_hash",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "credit_card",
  "creditCard",
  "ssn",
  "cvv",
]);

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return REDACTED;
  return `${local.slice(0, 2)}***@${domain}`;
}

function redactValue(key: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (SENSITIVE_KEYS.has(key.toLowerCase())) return REDACTED;
  // Mask emails in string values
  if (EMAIL_RE.test(value)) {
    return value.replace(EMAIL_RE, (match) => maskEmail(match));
  }
  return value;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactObject(value as Record<string, unknown>);
    } else {
      result[key] = redactValue(key, value);
    }
  }
  return result;
}

export const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-api-key']",
      "req.headers['x-internal-service']",
    ],
    censor: REDACTED,
  },
  serializers: {
    // Redact sensitive fields from logged objects
    req: (req) => ({
      method: req.method,
      url: req.url,
      hostname: req.hostname,
      remoteAddress: req.ip,
    }),
  },
  transport:
    process.env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
};

export const logger = pino(loggerConfig);

/** Create a child logger with PII-redacted context. */
export function safeChildLogger(bindings: Record<string, unknown>) {
  return logger.child(redactObject(bindings));
}
