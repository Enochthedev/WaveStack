"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api, type StreamSession } from "@/lib/api";
import type { RelayStatus } from "@/types";
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

// ── Rebroadcast / multistream relay ─────────────────────────────────────────

export function useRelayStatus() {
  const ctx = useAuthCtx();
  return useQuery<RelayStatus>({
    queryKey: ["stream", "relay", "status"],
    queryFn: () => api.stream.relay.status(ctx!),
    enabled: !!ctx,
    refetchInterval: 5_000,
    staleTime: 3_000,
  });
}

export function useStartRelay() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sourceUrl: string;
      platforms: { platform: string; streamKey: string }[];
    }) => api.stream.relay.start(ctx!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stream", "relay"] });
      toast.success("Multistream relay started");
    },
    onError: () => toast.error("Failed to start relay"),
  });
}

export function useStopRelay() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.stream.relay.stop(ctx!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stream", "relay"] });
      toast.success("Relay stopped");
    },
    onError: () => toast.error("Failed to stop relay"),
  });
}

export function useStopRelayTarget() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (platform: string) => api.stream.relay.stopTarget(ctx!, platform),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stream", "relay"] });
    },
    onError: () => toast.error("Failed to stop target"),
  });
}
