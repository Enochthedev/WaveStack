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

export function usePlatforms() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["platforms"],
    queryFn: () => api.platforms.list(ctx!),
    enabled: !!ctx,
    staleTime: 60_000,
  });
}

export function useDisconnectPlatform() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (platform: string) => api.platforms.disconnect(ctx!, platform),
    onSuccess: (_, platform) => {
      qc.invalidateQueries({ queryKey: ["platforms"] });
      toast.success(`Disconnected ${platform}`);
    },
    onError: () => toast.error("Failed to disconnect platform"),
  });
}
