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

// ─── Clip library (infinite scroll) ──────────────────────────────────────────

export function useClipLibrary(params?: {
  status?: string;
  platform?: string;
  sortBy?: string;
  pageSize?: number;
}) {
  const ctx = useAuthCtx();
  const limit = params?.pageSize ?? 24;
  return useInfiniteQuery({
    queryKey: ["clips", "library", params],
    queryFn: ({ pageParam = 0 }) => api.clips.list(ctx!, { ...params, limit, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, _all, offset) =>
      last.meta.hasMore ? (offset as number) + limit : undefined,
    enabled: !!ctx,
    staleTime: 60_000,
  });
}

// ─── Single clip ──────────────────────────────────────────────────────────────

export function useClip(id: string | null) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["clips", id],
    queryFn: () => api.clips.get(ctx!, id!),
    enabled: !!ctx && !!id,
    staleTime: 30_000,
  });
}

// ─── Create clip ──────────────────────────────────────────────────────────────

export function useCreateClip() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sourceStreamId?: string;
      sourceUrl?: string;
      startTime?: number;
      duration: number;
      title?: string;
    }) => api.clips.create(ctx!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clips"] });
      toast.success("Clip created and queued for processing");
    },
    onError: () => toast.error("Failed to create clip"),
  });
}

// ─── Update clip metadata ─────────────────────────────────────────────────────

export function useUpdateClip() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; title?: string; platforms?: string[] }) =>
      api.clips.update(ctx!, id, patch),
    onSuccess: (updated) => {
      qc.setQueryData(["clips", updated.id], updated);
      qc.invalidateQueries({ queryKey: ["clips", "library"] });
    },
    onError: () => toast.error("Failed to update clip"),
  });
}

// ─── Delete clip ──────────────────────────────────────────────────────────────

export function useDeleteClip() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.clips.delete(ctx!, id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ["clips", id] });
      qc.invalidateQueries({ queryKey: ["clips", "library"] });
      toast.success("Clip deleted");
    },
    onError: () => toast.error("Failed to delete clip"),
  });
}

// ─── Publish clip ──────────────────────────────────────────────────────────────

export function usePublishClip() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, platforms }: { id: string; platforms: string[] }) =>
      api.clips.publish(ctx!, id, platforms),
    onSuccess: (_, { platforms }) => {
      qc.invalidateQueries({ queryKey: ["clips"] });
      qc.invalidateQueries({ queryKey: ["queue"] });
      toast.success(`Queued for ${platforms.length} platform${platforms.length > 1 ? "s" : ""}`);
    },
    onError: () => toast.error("Failed to queue clip for publishing"),
  });
}

// ─── VOD highlights ───────────────────────────────────────────────────────────

export function useVodHighlights(streamId: string | null) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["clips", "highlights", streamId],
    queryFn: () => api.clips.vodHighlights(ctx!, streamId!),
    enabled: !!ctx && !!streamId,
  });
}

// ─── Approve highlight → create clip ─────────────────────────────────────────

export function useApproveHighlight() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (highlightId: string) => api.clips.approveHighlight(ctx!, highlightId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clips"] });
      toast.success("Clip created from highlight");
    },
    onError: () => toast.error("Failed to approve highlight"),
  });
}
