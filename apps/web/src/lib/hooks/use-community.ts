"use client";

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function useAuthCtx() {
  const { data: session } = useSession();
  return session?.accessToken && session.user?.orgId
    ? { token: session.accessToken, orgId: session.user.orgId }
    : null;
}

// ─── Community members (top fans, leaderboard) ────────────────────────────────

export function useCommunityMembers(params?: {
  limit?: number;
  offset?: number;
  tier?: string;
  platform?: string;
}) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["community", "members", params],
    queryFn: () => api.community.members(ctx!, params),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useCommunityMember(id: string | null) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["community", "members", id],
    queryFn: () => api.community.member(ctx!, id!),
    enabled: !!ctx && !!id,
    staleTime: 5 * 60_000,
  });
}

// ─── Chat logs (infinite scroll) ─────────────────────────────────────────────

export function useChatLogs(params?: {
  search?: string;
  platform?: string;
  streamId?: string;
  pageSize?: number;
}) {
  const ctx = useAuthCtx();
  const limit = params?.pageSize ?? 50;
  return useInfiniteQuery({
    queryKey: ["community", "chat-logs", params],
    queryFn: ({ pageParam = 0 }) =>
      api.community.chatLogs(ctx!, { ...params, limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, _all, offset) =>
      last.meta.hasMore ? (offset as number) + limit : undefined,
    enabled: !!ctx,
    staleTime: 30_000,
  });
}

// ─── Milestones & goals ───────────────────────────────────────────────────────

export function useMilestones() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["community", "milestones"],
    queryFn: () => api.community.milestones(ctx!),
    enabled: !!ctx,
    staleTime: 60_000,
  });
}

export function useUpsertMilestone() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.community.upsertMilestone>[1]) =>
      api.community.upsertMilestone(ctx!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "milestones"] });
      toast.success("Goal updated");
    },
    onError: () => toast.error("Failed to update goal"),
  });
}
