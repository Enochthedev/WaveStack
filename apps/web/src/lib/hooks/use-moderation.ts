"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function useAuthCtx() {
  const { data: session } = useSession();
  return session?.accessToken && session.user?.orgId
    ? { token: session.accessToken, orgId: session.user.orgId }
    : null;
}

// ─── Moderation stats ─────────────────────────────────────────────────────────

export function useModerationStats() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["moderation", "stats"],
    queryFn: () => api.moderation.stats(ctx!),
    enabled: !!ctx,
    refetchInterval: 30_000, // live stats
  });
}

// ─── Flagged messages (paginated) ─────────────────────────────────────────────

export function useFlaggedMessages(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  platform?: string;
}) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["moderation", "flagged", params],
    queryFn: () => api.moderation.flagged(ctx!, params),
    enabled: !!ctx,
    refetchInterval: 15_000,
  });
}

// ─── Act on a flagged message ─────────────────────────────────────────────────

export function useModerateMessage() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      action,
      reason,
    }: {
      messageId: string;
      action: string;
      reason?: string;
    }) => api.moderation.action(ctx!, messageId, action, reason),
    onSuccess: (updated) => {
      qc.setQueryData<{ data: (typeof updated)[] }>(["moderation", "flagged"], (prev) =>
        prev ? { ...prev, data: prev.data.map((m) => (m.id === updated.id ? updated : m)) } : prev,
      );
      qc.invalidateQueries({ queryKey: ["moderation", "stats"] });
      toast.success(`Action: ${updated.action ?? "applied"}`);
    },
    onError: () => toast.error("Moderation action failed"),
  });
}

// ─── Moderation rules ─────────────────────────────────────────────────────────

export function useModerationRules() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["moderation", "rules"],
    queryFn: () => api.moderation.rules(ctx!),
    enabled: !!ctx,
    staleTime: 60_000,
  });
}

export function useCreateModerationRule() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: Parameters<typeof api.moderation.createRule>[1]) =>
      api.moderation.createRule(ctx!, rule),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "rules"] });
      toast.success("Rule created");
    },
    onError: () => toast.error("Failed to create rule"),
  });
}

export function useUpdateModerationRule() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string } & Parameters<typeof api.moderation.updateRule>[2]) =>
      api.moderation.updateRule(ctx!, id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["moderation", "rules"] }),
    onError: () => toast.error("Failed to update rule"),
  });
}

export function useDeleteModerationRule() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.moderation.deleteRule(ctx!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "rules"] });
      toast.success("Rule deleted");
    },
    onError: () => toast.error("Failed to delete rule"),
  });
}

// ─── Banned users ─────────────────────────────────────────────────────────────

export function useBannedUsers() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["moderation", "banned"],
    queryFn: () => api.moderation.bannedUsers(ctx!),
    enabled: !!ctx,
    staleTime: 30_000,
  });
}

export function useUnbanUser() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, platform }: { userId: string; platform: string }) =>
      api.moderation.unban(ctx!, userId, platform),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderation", "banned"] });
      toast.success("User unbanned");
    },
    onError: () => toast.error("Failed to unban user"),
  });
}
