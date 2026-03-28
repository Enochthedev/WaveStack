"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

function useAuthCtx() {
  const { data: session } = useSession();
  return session?.accessToken && session.user?.orgId
    ? { token: session.accessToken, orgId: session.user.orgId }
    : null;
}

export function useQueueItems(params?: { limit?: number; offset?: number }) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["queue", params],
    queryFn: () => api.queue.list(ctx!, params),
    enabled: !!ctx,
    staleTime: 30_000,
  });
}
