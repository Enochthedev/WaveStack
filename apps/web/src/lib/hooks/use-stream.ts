"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api, type StreamSession } from "@/lib/api";
import { toast } from "sonner";

function useAuthCtx() {
  const { data: session } = useSession();
  return session?.accessToken && session.user?.orgId
    ? { token: session.accessToken, orgId: session.user.orgId }
    : null;
}

export function useLiveStream() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["stream", "live"],
    queryFn: () => api.stream.live(ctx!),
    enabled: !!ctx,
    refetchInterval: 20_000, // check every 20s
    staleTime: 10_000,
  });
}

export function useStreamSessions() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["stream", "sessions"],
    queryFn: () => api.stream.list(ctx!),
    enabled: !!ctx,
  });
}

export function useStartStream() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string; platform?: string }) => api.stream.start(ctx!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stream"] });
      toast.success("Stream started");
    },
    onError: () => toast.error("Failed to start stream"),
  });
}

export function useEndStream() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.stream.end(ctx!, id),
    onSuccess: (session: StreamSession) => {
      qc.setQueryData(["stream", "live"], null);
      qc.invalidateQueries({ queryKey: ["stream", "sessions"] });
      toast.success(`Stream ended · ${session.title ?? "Untitled"}`);
    },
    onError: () => toast.error("Failed to end stream"),
  });
}
