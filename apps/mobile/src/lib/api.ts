/**
 * Mobile API client — mirrors apps/web/src/lib/api.ts but uses
 * SecureStore for token storage instead of NextAuth.
 */
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  "http://localhost:3000";

// ─── Error ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Token helpers ────────────────────────────────────────────────────────────

const TOKEN_KEY = "wavestack_token";
const REFRESH_KEY = "wavestack_refresh_token";
const ORG_KEY = "wavestack_org_id";

export const tokenStore = {
  save: async (token: string, refreshToken: string, orgId: string) => {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
      SecureStore.setItemAsync(ORG_KEY, orgId),
    ]);
  },

  get: async (): Promise<{ token: string; orgId: string } | null> => {
    const [token, orgId] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(ORG_KEY),
    ]);
    if (!token || !orgId) return null;
    return { token, orgId };
  },

  getRefresh: () => SecureStore.getItemAsync(REFRESH_KEY),

  clear: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
      SecureStore.deleteItemAsync(ORG_KEY),
    ]);
  },
};

// ─── Core fetch ───────────────────────────────────────────────────────────────

type AuthContext = { token: string; orgId: string };

async function apiFetch<T>(
  path: string,
  { token, orgId }: AuthContext,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "x-org-id": orgId,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(res.status, body.error ?? res.statusText, body);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export type PaginatedResponse<T> = {
  data: T[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
};

export type LoginResponse = {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; name: string; orgId: string };
};

export type ApprovalRequest = {
  id: string;
  agentType: string;
  taskId: string;
  title: string;
  description?: string;
  urgency: "low" | "medium" | "high";
  expiresAt?: string;
  createdAt: string;
};

export type StreamSession = {
  id: string;
  title?: string;
  platform: string;
  status: "live" | "ended" | "pending";
  viewerCount: number;
  startedAt: string;
};

export type AgentTask = {
  id: string;
  agentType: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed" | "awaiting_approval";
  createdAt: string;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
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

// ─── API methods ──────────────────────────────────────────────────────────────

export const api = {
  agents: {
    getApprovals: (ctx: AuthContext): Promise<PaginatedResponse<ApprovalRequest>> =>
      apiFetch("/v1/agents/approvals", ctx),

    actOnApproval: (
      ctx: AuthContext,
      id: string,
      action: "approve" | "reject",
      feedback?: string
    ): Promise<{ success: boolean }> =>
      apiFetch(`/v1/agents/approvals/${id}`, ctx, {
        method: "POST",
        body: JSON.stringify({
          status: action === "approve" ? "approved" : "rejected",
          feedback,
        }),
      }),

    getTasks: (
      ctx: AuthContext,
      params?: { limit?: number; status?: string }
    ): Promise<PaginatedResponse<AgentTask>> => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.status) q.set("status", params.status);
      return apiFetch(`/v1/agents/tasks?${q}`, ctx);
    },
  },

  stream: {
    live: (ctx: AuthContext): Promise<StreamSession | null> =>
      apiFetch("/v1/streams/live", ctx),
    list: (ctx: AuthContext): Promise<PaginatedResponse<StreamSession>> =>
      apiFetch("/v1/streams", ctx),
  },

  users: {
    me: (ctx: AuthContext) =>
      apiFetch<{ id: string; email: string; name: string; orgId: string }>("/v1/users/me", ctx),
  },
};
