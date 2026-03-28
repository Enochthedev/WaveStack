"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

function useAuthCtx() {
  const { data: session } = useSession();
  return session?.accessToken && session.user?.orgId
    ? { token: session.accessToken, orgId: session.user.orgId }
    : null;
}

export function useSeoScores() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["seo", "scores"],
    queryFn: () => api.seo.scores(ctx!),
    enabled: !!ctx,
    staleTime: 10 * 60_000,
  });
}

export function useTrendingKeywords() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["seo", "trending"],
    queryFn: () => api.seo.trending(ctx!),
    enabled: !!ctx,
    staleTime: 30 * 60_000,
  });
}

export function useKeywordResearch(topic: string) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["seo", "keywords", topic],
    queryFn: () => api.seo.keywords(ctx!, topic),
    enabled: !!ctx && topic.length > 0,
    staleTime: 30 * 60_000,
  });
}

export function useAnalyzeTitle() {
  const ctx = useAuthCtx();
  return useMutation({
    mutationFn: ({ title, platform }: { title: string; platform: string }) =>
      api.seo.analyzeTitle(ctx!, title, platform),
  });
}

export function useGenerateTags() {
  const ctx = useAuthCtx();
  return useMutation({
    mutationFn: (topic: string) => api.seo.generateTags(ctx!, topic),
  });
}
