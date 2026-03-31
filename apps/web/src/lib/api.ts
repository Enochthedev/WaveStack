/**
 * Typed API client for WaveStack core-app.
 * All requests attach Authorization: Bearer <token> and x-org-id header.
 *
 * Every domain covered:
 *   auth · users · orgs · team · agents · queue · stream · platforms
 *   clips · analytics · moderation · community · revenue · seo
 *   competitors · workflows · skills · notifications · billing · assets
 */

import type {
  Clip as ClipType,
  VodHighlight as VodHighlightType,
  PlatformMetrics as PlatformMetricsType,
  DailyMetric as DailyMetricType,
  StreamAnalytics as StreamAnalyticsType,
  AudienceStats as AudienceStatsType,
  BestTimeSlot as BestTimeSlotType,
  RevenueSnapshot as RevenueSnapshotType,
  RevenueBreakdown as RevenueBreakdownType,
  PayoutRecord as PayoutRecordType,
  Sponsor as SponsorType,
  FlaggedMessage as FlaggedMessageType,
  ModerationRule as ModerationRuleType,
  BannedUser as BannedUserType,
  CommunityMember as CommunityMemberType,
  ChatLogEntry as ChatLogEntryType,
  Milestone as MilestoneType,
  SeoScore as SeoScoreType,
  KeywordData as KeywordDataType,
  Competitor as CompetitorType,
  TrendingGame as TrendingGameType,
  Workflow as WorkflowType,
  WorkflowRun as WorkflowRunType,
  Skill as SkillType,
  SkillExecution as SkillExecutionType,
  Notification as NotificationType,
  NotificationPref as NotificationPrefType,
  BillingInfo as BillingInfoType,
  Invoice as InvoiceType,
  TeamMember as TeamMemberType,
  TeamInvite as TeamInviteType,
  StreamSession,
  PlatformStatus,
  QueueItem,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Error type ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core fetch helper ───────────────────────────────────────────────────────

type AuthContext = { token: string; orgId: string };

async function apiFetch<T>(
  path: string,
  { token, orgId }: AuthContext,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-org-id": orgId,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? res.statusText, body);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Shared response shapes ───────────────────────────────────────────────────

export type PaginatedResponse<T> = {
  data: T[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
};

// ─── Auth (no token required) ─────────────────────────────────────────────────

export type LoginResponse = {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; orgId: string };
};

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(res.status, body.error ?? res.statusText, body);
      }
      return res.json() as Promise<LoginResponse>;
    }),

  register: (
    email: string,
    password: string,
    name: string,
    orgName: string,
  ): Promise<LoginResponse> =>
    fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, orgName }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(res.status, body.error ?? res.statusText, body);
      }
      return res.json() as Promise<LoginResponse>;
    }),

  refresh: (refreshToken: string): Promise<{ token: string; refreshToken: string }> =>
    fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).then(async (res) => {
      if (!res.ok) throw new ApiError(res.status, "Refresh failed");
      return res.json() as Promise<{ token: string; refreshToken: string }>;
    }),
};

// ─── Agent types ─────────────────────────────────────────────────────────────

export type AgentConfig = {
  agentType: string;
  name: string;
  autonomyLevel: "manual" | "copilot" | "autopilot";
  isEnabled: boolean;
  tasksCompleted: number;
  tasksRunning: number;
  description?: string;
};

export type AgentTask = {
  id: string;
  agentType: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed" | "awaiting_approval";
  priority: number;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type ApprovalRequest = {
  id: string;
  agentType: string;
  taskId: string;
  title: string;
  description?: string;
  payload?: Record<string, unknown>;
  urgency: "low" | "medium" | "high";
  expiresAt?: string;
  createdAt: string;
};

// Re-export for consumers that import from api.ts
export type { StreamSession, QueueItem, PlatformStatus };

// ─── User types ───────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string;
  createdAt: string;
};

export type OrgProfile = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
};

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    me: (ctx: AuthContext): Promise<UserProfile> => apiFetch("/v1/users/me", ctx),

    updateMe: (ctx: AuthContext, data: Partial<Pick<UserProfile, "name">>): Promise<UserProfile> =>
      apiFetch("/v1/users/me", ctx, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // ── Orgs ──────────────────────────────────────────────────────────────────
  orgs: {
    current: (ctx: AuthContext): Promise<OrgProfile> => apiFetch("/v1/orgs/current", ctx),

    update: (ctx: AuthContext, data: Partial<Pick<OrgProfile, "name">>): Promise<OrgProfile> =>
      apiFetch("/v1/orgs/current", ctx, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // ── Agents ────────────────────────────────────────────────────────────────
  agents: {
    getConfig: (ctx: AuthContext): Promise<AgentConfig[]> => apiFetch("/v1/agents/config", ctx),

    updateConfig: (
      ctx: AuthContext,
      agentType: string,
      patch: Partial<Pick<AgentConfig, "autonomyLevel" | "isEnabled">>,
    ): Promise<AgentConfig> =>
      apiFetch("/v1/agents/config", ctx, {
        method: "PUT",
        body: JSON.stringify({ agentType, ...patch }),
      }),

    getTasks: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number; status?: string },
    ): Promise<PaginatedResponse<AgentTask>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.status) q.set("status", params.status);
      return apiFetch(`/v1/agents/tasks?${q}`, ctx);
    },

    getApprovals: (ctx: AuthContext): Promise<PaginatedResponse<ApprovalRequest>> =>
      apiFetch("/v1/agents/approvals", ctx),

    actOnApproval: (
      ctx: AuthContext,
      id: string,
      action: "approve" | "reject",
      feedback?: string,
    ): Promise<{ success: boolean }> =>
      apiFetch(`/v1/agents/approvals/${id}`, ctx, {
        method: "POST",
        // Server expects "approved" | "rejected" mapped from "approve" | "reject"
        body: JSON.stringify({
          status: action === "approve" ? "approved" : "rejected",
          feedback,
        }),
      }),

    chat: (ctx: AuthContext, message: string, sessionId?: string): Promise<Response> =>
      fetch(`${BASE_URL}/v1/agents/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ctx.token}`,
          "x-org-id": ctx.orgId,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message, sessionId }),
      }),

    getChatSessions: (ctx: AuthContext): Promise<{ id: string; createdAt: string }[]> =>
      apiFetch("/v1/agents/chat/sessions", ctx),
  },

  // ── Queue ─────────────────────────────────────────────────────────────────
  queue: {
    list: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number },
    ): Promise<PaginatedResponse<QueueItem>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      return apiFetch(`/v1/queue?${q}`, ctx);
    },
  },

  // ── Stream ────────────────────────────────────────────────────────────────
  stream: {
    list: (ctx: AuthContext): Promise<PaginatedResponse<StreamSession>> =>
      apiFetch("/v1/streams", ctx),

    live: (ctx: AuthContext): Promise<StreamSession | null> => apiFetch("/v1/streams/live", ctx),

    start: (
      ctx: AuthContext,
      data: { title?: string; platform?: string },
    ): Promise<StreamSession> =>
      apiFetch("/v1/streams/start", ctx, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    end: (ctx: AuthContext, id: string): Promise<StreamSession> =>
      apiFetch(`/v1/streams/${id}/end`, ctx, { method: "POST" }),
  },

  // ── Platforms ─────────────────────────────────────────────────────────────
  platforms: {
    list: (ctx: AuthContext): Promise<PlatformStatus[]> => apiFetch("/v1/platforms", ctx),

    status: (ctx: AuthContext, platform: string): Promise<PlatformStatus> =>
      apiFetch(`/v1/platforms/${platform}/status`, ctx),

    connect: (
      ctx: AuthContext,
      platform: string,
      credentials: Record<string, string>,
    ): Promise<PlatformStatus> =>
      apiFetch("/v1/platforms/connect", ctx, {
        method: "POST",
        body: JSON.stringify({ platform, ...credentials }),
      }),

    disconnect: (ctx: AuthContext, platform: string): Promise<void> =>
      apiFetch(`/v1/platforms/${platform}`, ctx, { method: "DELETE" }),
  },

  // ── Assets ────────────────────────────────────────────────────────────────
  assets: {
    list: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number },
    ): Promise<
      PaginatedResponse<{
        id: string;
        filename: string;
        mimeType: string;
        duration?: number;
        sizeBytes: number;
        status: string;
        createdAt: string;
      }>
    > => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      return apiFetch(`/v1/assets?${q}`, ctx);
    },
  },

  // ── Clips ─────────────────────────────────────────────────────────────────
  clips: {
    list: (
      ctx: AuthContext,
      params?: {
        limit?: number;
        offset?: number;
        status?: string;
        platform?: string;
        sortBy?: string;
      },
    ): Promise<PaginatedResponse<ClipType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.status) q.set("status", params.status);
      if (params?.platform) q.set("platform", params.platform);
      if (params?.sortBy) q.set("sortBy", params.sortBy);
      return apiFetch(`/v1/clips?${q}`, ctx);
    },

    get: (ctx: AuthContext, id: string): Promise<ClipType> => apiFetch(`/v1/clips/${id}`, ctx),

    create: (
      ctx: AuthContext,
      data: {
        sourceStreamId?: string;
        sourceUrl?: string;
        startTime?: number;
        duration: number;
        title?: string;
      },
    ): Promise<ClipType> =>
      apiFetch("/v1/clips", ctx, { method: "POST", body: JSON.stringify(data) }),

    update: (
      ctx: AuthContext,
      id: string,
      patch: { title?: string; platforms?: string[] },
    ): Promise<ClipType> =>
      apiFetch(`/v1/clips/${id}`, ctx, { method: "PATCH", body: JSON.stringify(patch) }),

    delete: (ctx: AuthContext, id: string): Promise<void> =>
      apiFetch(`/v1/clips/${id}`, ctx, { method: "DELETE" }),

    publish: (ctx: AuthContext, id: string, platforms: string[]): Promise<{ queued: string[] }> =>
      apiFetch(`/v1/clips/${id}/publish`, ctx, {
        method: "POST",
        body: JSON.stringify({ platforms }),
      }),

    vodHighlights: (ctx: AuthContext, streamId: string): Promise<VodHighlightType[]> =>
      apiFetch(`/v1/streams/${streamId}/highlights`, ctx),

    approveHighlight: (ctx: AuthContext, highlightId: string): Promise<ClipType> =>
      apiFetch(`/v1/highlights/${highlightId}/approve`, ctx, { method: "POST" }),
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: {
    overview: (
      ctx: AuthContext,
      period: string,
    ): Promise<{ platforms: PlatformMetricsType[]; daily: DailyMetricType[] }> =>
      apiFetch(`/v1/analytics/overview?period=${period}`, ctx),

    streams: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number },
    ): Promise<PaginatedResponse<StreamAnalyticsType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      return apiFetch(`/v1/analytics/streams?${q}`, ctx);
    },

    streamDetail: (ctx: AuthContext, streamId: string): Promise<StreamAnalyticsType> =>
      apiFetch(`/v1/analytics/streams/${streamId}`, ctx),

    audience: (ctx: AuthContext, period: string): Promise<AudienceStatsType> =>
      apiFetch(`/v1/analytics/audience?period=${period}`, ctx),

    bestTimes: (ctx: AuthContext): Promise<BestTimeSlotType[]> =>
      apiFetch("/v1/analytics/best-times", ctx),

    clipPerformance: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number; period?: string },
    ): Promise<PaginatedResponse<ClipType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.period) q.set("period", params.period);
      return apiFetch(`/v1/analytics/clips?${q}`, ctx);
    },

    revenue: (
      ctx: AuthContext,
      period: string,
    ): Promise<{
      monthly: RevenueSnapshotType[];
      breakdown: RevenueBreakdownType;
      payouts: PayoutRecordType[];
    }> => apiFetch(`/v1/analytics/revenue?period=${period}`, ctx),

    growthScore: (
      ctx: AuthContext,
    ): Promise<{ score: number; working: string[]; notWorking: string[]; actions: string[] }> =>
      apiFetch("/v1/analytics/growth-score", ctx),
  },

  // ── Moderation ────────────────────────────────────────────────────────────
  moderation: {
    flagged: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number; status?: string; platform?: string },
    ): Promise<PaginatedResponse<FlaggedMessageType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.status) q.set("status", params.status);
      if (params?.platform) q.set("platform", params.platform);
      return apiFetch(`/v1/moderation/flagged?${q}`, ctx);
    },

    action: (
      ctx: AuthContext,
      messageId: string,
      action: string,
      reason?: string,
    ): Promise<FlaggedMessageType> =>
      apiFetch(`/v1/moderation/flagged/${messageId}/action`, ctx, {
        method: "POST",
        body: JSON.stringify({ action, reason }),
      }),

    rules: (ctx: AuthContext): Promise<ModerationRuleType[]> =>
      apiFetch("/v1/moderation/rules", ctx),

    createRule: (
      ctx: AuthContext,
      rule: Omit<ModerationRuleType, "id" | "triggerCount">,
    ): Promise<ModerationRuleType> =>
      apiFetch("/v1/moderation/rules", ctx, { method: "POST", body: JSON.stringify(rule) }),

    updateRule: (
      ctx: AuthContext,
      id: string,
      patch: Partial<ModerationRuleType>,
    ): Promise<ModerationRuleType> =>
      apiFetch(`/v1/moderation/rules/${id}`, ctx, { method: "PATCH", body: JSON.stringify(patch) }),

    deleteRule: (ctx: AuthContext, id: string): Promise<void> =>
      apiFetch(`/v1/moderation/rules/${id}`, ctx, { method: "DELETE" }),

    bannedUsers: (ctx: AuthContext): Promise<BannedUserType[]> =>
      apiFetch("/v1/moderation/banned", ctx),

    unban: (ctx: AuthContext, userId: string, platform: string): Promise<void> =>
      apiFetch(`/v1/moderation/banned/${userId}`, ctx, {
        method: "DELETE",
        body: JSON.stringify({ platform }),
      }),

    stats: (
      ctx: AuthContext,
    ): Promise<{
      flaggedToday: number;
      autoActioned: number;
      pendingReview: number;
      falsePositiveRate: number;
    }> => apiFetch("/v1/moderation/stats", ctx),
  },

  // ── Community ─────────────────────────────────────────────────────────────
  community: {
    members: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number; tier?: string; platform?: string },
    ): Promise<PaginatedResponse<CommunityMemberType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.tier) q.set("tier", params.tier);
      if (params?.platform) q.set("platform", params.platform);
      return apiFetch(`/v1/community/members?${q}`, ctx);
    },

    member: (ctx: AuthContext, id: string): Promise<CommunityMemberType> =>
      apiFetch(`/v1/community/members/${id}`, ctx),

    chatLogs: (
      ctx: AuthContext,
      params?: {
        limit?: number;
        offset?: number;
        search?: string;
        platform?: string;
        streamId?: string;
      },
    ): Promise<PaginatedResponse<ChatLogEntryType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.search) q.set("search", params.search);
      if (params?.platform) q.set("platform", params.platform);
      if (params?.streamId) q.set("streamId", params.streamId);
      return apiFetch(`/v1/community/chat-logs?${q}`, ctx);
    },

    milestones: (ctx: AuthContext): Promise<MilestoneType[]> =>
      apiFetch("/v1/community/milestones", ctx),

    upsertMilestone: (
      ctx: AuthContext,
      data: Omit<MilestoneType, "id" | "reachedAt">,
    ): Promise<MilestoneType> =>
      apiFetch("/v1/community/milestones", ctx, { method: "POST", body: JSON.stringify(data) }),
  },

  // ── Revenue ───────────────────────────────────────────────────────────────
  revenue: {
    overview: (
      ctx: AuthContext,
    ): Promise<{
      today: number;
      month: number;
      forecast: number;
      allTime: number;
      breakdown: RevenueBreakdownType;
    }> => apiFetch("/v1/revenue/overview", ctx),

    history: (ctx: AuthContext, months?: number): Promise<RevenueSnapshotType[]> =>
      apiFetch(`/v1/revenue/history?months=${months ?? 12}`, ctx),

    payouts: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number; year?: number },
    ): Promise<PaginatedResponse<PayoutRecordType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.year) q.set("year", String(params.year));
      return apiFetch(`/v1/revenue/payouts?${q}`, ctx);
    },

    sponsors: (
      ctx: AuthContext,
      params?: { status?: string },
    ): Promise<PaginatedResponse<SponsorType>> => {
      const q = new URLSearchParams();
      if (params?.status) q.set("status", params.status);
      return apiFetch(`/v1/revenue/sponsors?${q}`, ctx);
    },

    createSponsor: (
      ctx: AuthContext,
      data: Omit<SponsorType, "id" | "createdAt">,
    ): Promise<SponsorType> =>
      apiFetch("/v1/revenue/sponsors", ctx, { method: "POST", body: JSON.stringify(data) }),

    updateSponsor: (
      ctx: AuthContext,
      id: string,
      patch: Partial<SponsorType>,
    ): Promise<SponsorType> =>
      apiFetch(`/v1/revenue/sponsors/${id}`, ctx, { method: "PATCH", body: JSON.stringify(patch) }),

    deleteSponsor: (ctx: AuthContext, id: string): Promise<void> =>
      apiFetch(`/v1/revenue/sponsors/${id}`, ctx, { method: "DELETE" }),

    completeDeliverable: (
      ctx: AuthContext,
      sponsorId: string,
      deliverableId: string,
    ): Promise<SponsorType> =>
      apiFetch(`/v1/revenue/sponsors/${sponsorId}/deliverables/${deliverableId}/complete`, ctx, {
        method: "POST",
      }),
  },

  // ── SEO ───────────────────────────────────────────────────────────────────
  seo: {
    scores: (ctx: AuthContext): Promise<SeoScoreType[]> => apiFetch("/v1/seo/scores", ctx),

    analyzeTitle: (
      ctx: AuthContext,
      title: string,
      platform: string,
    ): Promise<{ score: number; suggestions: string[]; keywords: string[] }> =>
      apiFetch("/v1/seo/analyze-title", ctx, {
        method: "POST",
        body: JSON.stringify({ title, platform }),
      }),

    keywords: (ctx: AuthContext, topic: string): Promise<KeywordDataType[]> =>
      apiFetch(`/v1/seo/keywords?topic=${encodeURIComponent(topic)}`, ctx),

    trending: (ctx: AuthContext): Promise<KeywordDataType[]> => apiFetch("/v1/seo/trending", ctx),

    generateTags: (ctx: AuthContext, topic: string): Promise<string[]> =>
      apiFetch("/v1/seo/tags", ctx, { method: "POST", body: JSON.stringify({ topic }) }),
  },

  // ── Competitors ───────────────────────────────────────────────────────────
  competitors: {
    list: (ctx: AuthContext): Promise<CompetitorType[]> => apiFetch("/v1/competitors", ctx),

    add: (
      ctx: AuthContext,
      data: { channelName: string; platform: string; profileUrl?: string },
    ): Promise<CompetitorType> =>
      apiFetch("/v1/competitors", ctx, { method: "POST", body: JSON.stringify(data) }),

    remove: (ctx: AuthContext, id: string): Promise<void> =>
      apiFetch(`/v1/competitors/${id}`, ctx, { method: "DELETE" }),

    trending: (ctx: AuthContext): Promise<TrendingGameType[]> =>
      apiFetch("/v1/competitors/trending", ctx),
  },

  // ── Workflows ─────────────────────────────────────────────────────────────
  workflows: {
    list: (ctx: AuthContext): Promise<PaginatedResponse<WorkflowType>> =>
      apiFetch("/v1/workflows", ctx),

    get: (ctx: AuthContext, id: string): Promise<WorkflowType> =>
      apiFetch(`/v1/workflows/${id}`, ctx),

    create: (
      ctx: AuthContext,
      data: Omit<WorkflowType, "id" | "runsTotal" | "createdAt">,
    ): Promise<WorkflowType> =>
      apiFetch("/v1/workflows", ctx, { method: "POST", body: JSON.stringify(data) }),

    update: (ctx: AuthContext, id: string, patch: Partial<WorkflowType>): Promise<WorkflowType> =>
      apiFetch(`/v1/workflows/${id}`, ctx, { method: "PATCH", body: JSON.stringify(patch) }),

    delete: (ctx: AuthContext, id: string): Promise<void> =>
      apiFetch(`/v1/workflows/${id}`, ctx, { method: "DELETE" }),

    run: (ctx: AuthContext, id: string): Promise<WorkflowRunType> =>
      apiFetch(`/v1/workflows/${id}/run`, ctx, { method: "POST" }),

    runs: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number },
    ): Promise<PaginatedResponse<WorkflowRunType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      return apiFetch(`/v1/workflows/runs?${q}`, ctx);
    },
  },

  // ── Skills ────────────────────────────────────────────────────────────────
  skills: {
    /** List skills owned by the caller's org. */
    list: (ctx: AuthContext): Promise<SkillType[]> => apiFetch("/v1/skills", ctx),

    /** Get a single skill by ID (with versions). */
    get: (ctx: AuthContext, id: string): Promise<SkillType> => apiFetch(`/v1/skills/${id}`, ctx),

    /** Create a new custom skill. */
    create: (
      ctx: AuthContext,
      data: { name: string; slug: string; description?: string; category: string },
    ): Promise<SkillType> =>
      apiFetch("/v1/skills", ctx, { method: "POST", body: JSON.stringify(data) }),

    /** Update skill metadata. */
    update: (
      ctx: AuthContext,
      id: string,
      patch: { name?: string; description?: string; category?: string },
    ): Promise<SkillType> =>
      apiFetch(`/v1/skills/${id}`, ctx, { method: "PUT", body: JSON.stringify(patch) }),

    /** Delete a skill. */
    delete: (ctx: AuthContext, id: string): Promise<void> =>
      apiFetch(`/v1/skills/${id}`, ctx, { method: "DELETE" }),

    /** Publish skill to the marketplace. */
    publish: (ctx: AuthContext, id: string): Promise<SkillType> =>
      apiFetch(`/v1/skills/${id}/publish`, ctx, { method: "POST" }),

    /** Execute a skill (async by default, pass sync:true for blocking). */
    execute: (
      ctx: AuthContext,
      id: string,
      data: { input?: Record<string, any>; versionId?: string; sync?: boolean },
    ): Promise<SkillExecutionType> =>
      apiFetch(`/v1/skills/${id}/execute`, ctx, { method: "POST", body: JSON.stringify(data) }),
  },

  // ── Skills Marketplace ──────────────────────────────────────────────────
  marketplace: {
    /** Browse public skills. */
    browse: (ctx: AuthContext, params?: { category?: string }): Promise<SkillType[]> => {
      const q = new URLSearchParams();
      if (params?.category) q.set("category", params.category);
      return apiFetch(`/v1/marketplace?${q}`, ctx);
    },

    /** Install a public skill into the caller's org. */
    install: (ctx: AuthContext, id: string): Promise<SkillType> =>
      apiFetch(`/v1/marketplace/${id}/install`, ctx, { method: "POST" }),

    /** Fork a public skill. */
    fork: (ctx: AuthContext, id: string): Promise<SkillType> =>
      apiFetch(`/v1/marketplace/${id}/fork`, ctx, { method: "POST" }),

    /** Rate a skill (1-5). */
    rate: (
      ctx: AuthContext,
      id: string,
      data: { rating: number; review?: string },
    ): Promise<void> =>
      apiFetch(`/v1/marketplace/${id}/rate`, ctx, { method: "POST", body: JSON.stringify(data) }),
  },

  // ── Skill Executions ────────────────────────────────────────────────────
  executions: {
    list: (ctx: AuthContext): Promise<SkillExecutionType[]> => apiFetch("/v1/executions", ctx),

    get: (ctx: AuthContext, id: string): Promise<SkillExecutionType> =>
      apiFetch(`/v1/executions/${id}`, ctx),

    cancel: (ctx: AuthContext, id: string): Promise<SkillExecutionType> =>
      apiFetch(`/v1/executions/${id}/cancel`, ctx, { method: "POST" }),
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    list: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number; unreadOnly?: boolean },
    ): Promise<PaginatedResponse<NotificationType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      if (params?.unreadOnly) q.set("unreadOnly", "true");
      return apiFetch(`/v1/notifications?${q}`, ctx);
    },

    markRead: (ctx: AuthContext, ids: string[]): Promise<void> =>
      apiFetch("/v1/notifications/read", ctx, { method: "POST", body: JSON.stringify({ ids }) }),

    markAllRead: (ctx: AuthContext): Promise<void> =>
      apiFetch("/v1/notifications/read-all", ctx, { method: "POST" }),

    prefs: (ctx: AuthContext): Promise<NotificationPrefType[]> =>
      apiFetch("/v1/notifications/prefs", ctx),

    updatePrefs: (
      ctx: AuthContext,
      prefs: NotificationPrefType[],
    ): Promise<NotificationPrefType[]> =>
      apiFetch("/v1/notifications/prefs", ctx, { method: "PUT", body: JSON.stringify({ prefs }) }),
  },

  // ── Billing ───────────────────────────────────────────────────────────────
  billing: {
    info: (ctx: AuthContext): Promise<BillingInfoType> => apiFetch("/v1/billing", ctx),

    invoices: (
      ctx: AuthContext,
      params?: { limit?: number; offset?: number },
    ): Promise<PaginatedResponse<InvoiceType>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.offset) q.set("offset", String(params.offset));
      return apiFetch(`/v1/billing/invoices?${q}`, ctx);
    },

    upgrade: (
      ctx: AuthContext,
      plan: string,
      cycle: "monthly" | "annual",
    ): Promise<{ checkoutUrl: string }> =>
      apiFetch("/v1/billing/upgrade", ctx, {
        method: "POST",
        body: JSON.stringify({ plan, cycle }),
      }),

    cancel: (ctx: AuthContext): Promise<void> =>
      apiFetch("/v1/billing/cancel", ctx, { method: "POST" }),
  },

  // ── Team ──────────────────────────────────────────────────────────────────
  team: {
    members: (ctx: AuthContext): Promise<TeamMemberType[]> => apiFetch("/v1/team/members", ctx),

    invites: (ctx: AuthContext): Promise<TeamInviteType[]> => apiFetch("/v1/team/invites", ctx),

    invite: (ctx: AuthContext, email: string, role: string): Promise<TeamInviteType> =>
      apiFetch("/v1/team/invites", ctx, { method: "POST", body: JSON.stringify({ email, role }) }),

    revokeInvite: (ctx: AuthContext, inviteId: string): Promise<void> =>
      apiFetch(`/v1/team/invites/${inviteId}`, ctx, { method: "DELETE" }),

    updateRole: (ctx: AuthContext, memberId: string, role: string): Promise<TeamMemberType> =>
      apiFetch(`/v1/team/members/${memberId}/role`, ctx, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),

    remove: (ctx: AuthContext, memberId: string): Promise<void> =>
      apiFetch(`/v1/team/members/${memberId}`, ctx, { method: "DELETE" }),
  },
};
