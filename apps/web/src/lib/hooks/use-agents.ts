"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api, type AgentConfig, type ApprovalRequest } from "@/lib/api";
import { toast } from "sonner";

function useAuthCtx() {
  const { data: session } = useSession();
  return session?.accessToken && session.user?.orgId
    ? { token: session.accessToken, orgId: session.user.orgId }
    : null;
}

// ─── Agent config ────────────────────────────────────────────────────────────

export function useAgentConfig() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["agents", "config"],
    queryFn: () => api.agents.getConfig(ctx!),
    enabled: !!ctx,
    staleTime: 30_000,
  });
}

export function useUpdateAgentConfig() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      agentType,
      patch,
    }: {
      agentType: string;
      patch: Partial<Pick<AgentConfig, "autonomyLevel" | "isEnabled">>;
    }) => api.agents.updateConfig(ctx!, agentType, patch),
    onSuccess: (updated) => {
      qc.setQueryData<AgentConfig[]>(["agents", "config"], (prev) =>
        prev?.map((a) => (a.agentType === updated.agentType ? updated : a)),
      );
    },
    onError: () => toast.error("Failed to update agent config"),
  });
}

// ─── Agent tasks ─────────────────────────────────────────────────────────────

export function useAgentTasks(params?: { limit?: number; offset?: number; status?: string }) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["agents", "tasks", params],
    queryFn: () => api.agents.getTasks(ctx!, params),
    enabled: !!ctx,
  });
}

// ─── Approvals ───────────────────────────────────────────────────────────────

export function useApprovals() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["agents", "approvals"],
    queryFn: () => api.agents.getApprovals(ctx!),
    enabled: !!ctx,
    refetchInterval: 15_000, // poll every 15s for new approvals
  });
}

export function useActOnApproval() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      feedback,
    }: {
      id: string;
      action: "approve" | "reject";
      feedback?: string;
    }) => api.agents.actOnApproval(ctx!, id, action, feedback),
    onSuccess: (_, { id, action }) => {
      // Remove the approval from cache
      qc.setQueryData<{ data: ApprovalRequest[] }>(["agents", "approvals"], (prev) =>
        prev ? { ...prev, data: prev.data.filter((a) => a.id !== id) } : prev,
      );
      toast.success(action === "approve" ? "Approved" : "Rejected");
    },
    onError: () => toast.error("Action failed — please try again"),
  });
}
