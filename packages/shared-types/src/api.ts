// API contract types — request/response shapes used across client/server

// ── Generic wrappers ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  orgName?: string;
}

export interface RegisterResponse extends AuthTokenResponse {
  user: { id: string; email: string; name: string | null };
  org: { id: string; name: string; slug: string };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends AuthTokenResponse {
  user: { id: string; email: string; name: string | null; avatarUrl: string | null };
  org: { id: string; name: string; slug: string; plan: string };
}

// ── Queue ────────────────────────────────────────────────────────────────────

export interface QueueItem {
  id: string;
  orgId: string;
  assetId: string | null;
  title: string;
  caption: string | null;
  hashtags: string[];
  platforms: string[];
  scheduleAt: string | null;
  timezone: string | null;
  status: "queued" | "processing" | "published" | "failed" | "cancelled";
  idempotencyKey: string;
  aiGenerated: boolean;
  approvalRequired: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQueueItemRequest {
  assetId?: string;
  title: string;
  caption?: string;
  hashtags?: string[];
  platforms: string[];
  scheduleAt?: string;
  timezone?: string;
  approvalRequired?: boolean;
}

// ── Skills ───────────────────────────────────────────────────────────────────

export interface Skill {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  isBuiltIn: boolean;
  isEnabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
}

export interface SkillExecution {
  id: string;
  skillId: string;
  orgId: string;
  triggerType: "manual" | "scheduled" | "agent" | "webhook";
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  stepResults: Record<string, unknown> | null;
  status: "pending" | "running" | "done" | "failed";
  durationMs: number | null;
  createdAt: string;
}

// ── Notifications ────────────────────────────────────────────────────────────

export type NotificationEventType =
  | "approval_created"
  | "approval_reviewed"
  | "task_completed"
  | "task_failed"
  | "stream_live"
  | "stream_ended"
  | "clip_ready"
  | "post_published"
  | "viewer_milestone"
  | "hype_moment"
  | "model_deployed";

export interface NotificationEvent {
  event: NotificationEventType;
  data: Record<string, unknown>;
  ts: number;
}
