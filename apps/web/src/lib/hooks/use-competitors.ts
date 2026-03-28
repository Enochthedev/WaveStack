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

export function useCompetitors() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["competitors"],
    queryFn: () => api.competitors.list(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useAddCompetitor() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { channelName: string; platform: string; profileUrl?: string }) =>
      api.competitors.add(ctx!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      toast.success("Competitor added");
    },
    onError: () => toast.error("Failed to add competitor"),
  });
}

export function useRemoveCompetitor() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.competitors.remove(ctx!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitors"] });
      toast.success("Competitor removed");
    },
    onError: () => toast.error("Failed to remove competitor"),
  });
}

export function useTrendingGames() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["competitors", "trending"],
    queryFn: () => api.competitors.trending(ctx!),
    enabled: !!ctx,
    staleTime: 30 * 60_000,
  });
}
