"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import type { AnalyticsPeriod } from "@/types";

function useAuthCtx() {
  const { data: session } = useSession();
  return session?.accessToken && session.user?.orgId
    ? { token: session.accessToken, orgId: session.user.orgId }
    : null;
}

// ─── Overview (cross-platform metrics + daily chart) ─────────────────────────

export function useAnalyticsOverview(period: AnalyticsPeriod = "30d") {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["analytics", "overview", period],
    queryFn: () => api.analytics.overview(ctx!, period),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

// ─── Stream history list ──────────────────────────────────────────────────────

export function useStreamHistory(params?: { limit?: number; offset?: number }) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["analytics", "streams", params],
    queryFn: () => api.analytics.streams(ctx!, params),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

// ─── Single stream deep analytics ────────────────────────────────────────────

export function useStreamDetail(streamId: string | null) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["analytics", "streams", streamId],
    queryFn: () => api.analytics.streamDetail(ctx!, streamId!),
    enabled: !!ctx && !!streamId,
    staleTime: 10 * 60_000,
  });
}

// ─── Audience intelligence ────────────────────────────────────────────────────

export function useAudienceStats(period: AnalyticsPeriod = "30d") {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["analytics", "audience", period],
    queryFn: () => api.analytics.audience(ctx!, period),
    enabled: !!ctx,
    staleTime: 10 * 60_000,
  });
}

// ─── Best time to stream ──────────────────────────────────────────────────────

export function useBestTimes() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["analytics", "best-times"],
    queryFn: () => api.analytics.bestTimes(ctx!),
    enabled: !!ctx,
    staleTime: 60 * 60_000, // 1 hour
  });
}

// ─── Clip performance ─────────────────────────────────────────────────────────

export function useClipPerformance(params?: { limit?: number; offset?: number; period?: string }) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["analytics", "clips", params],
    queryFn: () => api.analytics.clipPerformance(ctx!, params),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

// ─── Revenue analytics ────────────────────────────────────────────────────────

export function useRevenueAnalytics(period: AnalyticsPeriod = "30d") {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["analytics", "revenue", period],
    queryFn: () => api.analytics.revenue(ctx!, period),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

// ─── Growth score ─────────────────────────────────────────────────────────────

export function useGrowthScore() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["analytics", "growth-score"],
    queryFn: () => api.analytics.growthScore(ctx!),
    enabled: !!ctx,
    staleTime: 60 * 60_000,
  });
}
