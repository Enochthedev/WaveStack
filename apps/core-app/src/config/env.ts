import { z } from "zod";

const ALL_ZEROS_KEY = "0000000000000000000000000000000000000000000000000000000000000000";

const Env = z.object({
  // Server
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default("redis://redis:6379"),

  // Auth
  AUTH_MODE: z.enum(["none", "hs256", "jwks"]).default("none"),
  AUTH_JWT_SECRET: z.string().optional(),
  AUTH_JWKS_URL: z.string().url().optional(),
  AUTH_AUDIENCE: z.string().optional(),
  AUTH_ISSUER: z.string().optional(),
  AUTH_KEYS_DIR: z.string().optional(),
  AUTH_KEY_ID: z.string().default("wavestack-1"),
  AUTH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  AUTH_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Token encryption (32 bytes hex = 64 chars)
  TOKEN_ENCRYPTION_KEY: z.string().length(64).default(ALL_ZEROS_KEY),

  // Internal service auth
  INTERNAL_SERVICE_SECRET: z.string().default("dev-internal-secret"),

  // Service clients (JSON array of { client_id, client_secret, org_id, scopes })
  SERVICE_CLIENTS_JSON: z.string().default("[]"),

  // Service URLs
  AGENT_RUNTIME_URL: z.string().default("http://agent-runtime:3300"),
  STREAM_ENGINE_URL: z.string().default("http://stream-engine:3400"),
  CONTENT_PIPELINE_URL: z.string().default("http://content-pipeline:3500"),
  SOCIAL_AGENTS_URL: z.string().default("http://social-agents:3600"),
  MODEL_ROUTER_URL: z.string().default("http://model-router:3700"),
  TRAINING_PIPELINE_URL: z.string().default("http://training-pipeline:3800"),
  KNOWLEDGE_URL: z.string().default("http://knowledge:3900"),
  NOTIFICATIONS_URL: z.string().default("http://notifications:4000"),
  SKILLS_SERVICE_URL: z.string().default("http://skills:3200"),
  CLIPPER_URL: z.string().default("http://clipper:8000"),

  // Object storage (Cloudflare R2 / S3-compatible)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("creator-platform-dev"),
  R2_PUBLIC_URL: z.string().url().optional(),

  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_POINTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_DURATION: z.coerce.number().int().positive().default(60),

  // CORS
  CORS_ORIGINS: z.string().default("*"),

  // OpenTelemetry
  OTEL_ENABLED: z.coerce.boolean().default(false),
  OTEL_SERVICE_NAME: z.string().default("core-app"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

export type Env = z.infer<typeof Env>;
export const env = Env.parse(process.env);

// ── Production safety guards ────────────────────────────────────────────────
if (env.NODE_ENV === "production") {
  const fatal: string[] = [];

  if (env.TOKEN_ENCRYPTION_KEY === ALL_ZEROS_KEY) {
    fatal.push(
      "TOKEN_ENCRYPTION_KEY is the insecure all-zeros default. Generate a real key: openssl rand -hex 32",
    );
  }

  if (env.AUTH_MODE === "none") {
    fatal.push(
      "AUTH_MODE=none disables authentication. Set AUTH_MODE to hs256 or jwks in production.",
    );
  }

  if (env.INTERNAL_SERVICE_SECRET === "dev-internal-secret") {
    fatal.push("INTERNAL_SERVICE_SECRET is the default dev value. Set a strong random secret.");
  }

  if (env.CORS_ORIGINS === "*") {
    fatal.push("CORS_ORIGINS=* allows any origin. Set explicit allowed origins for production.");
  }

  if (fatal.length > 0) {
    console.error("\n=== FATAL: Insecure configuration detected in production ===");
    for (const msg of fatal) console.error(`  - ${msg}`);
    console.error("===\nRefusing to start. Fix the above and restart.\n");
    process.exit(1);
  }
}
