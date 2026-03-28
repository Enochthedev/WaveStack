"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api, type UserProfile, type OrgProfile } from "@/lib/api";
import { toast } from "sonner";

function useAuthCtx() {
  const { data: session } = useSession();
  return session?.accessToken && session.user?.orgId
    ? { token: session.accessToken, orgId: session.user.orgId }
    : null;
}

export function useCurrentUser() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => api.users.me(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useCurrentOrg() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["orgs", "current"],
    queryFn: () => api.orgs.current(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateMe() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<UserProfile, "name">>) => api.users.updateMe(ctx!, data),
    onSuccess: (updated) => {
      qc.setQueryData(["users", "me"], updated);
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });
}

export function useUpdateOrg() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Pick<OrgProfile, "name">>) => api.orgs.update(ctx!, data),
    onSuccess: (updated) => {
      qc.setQueryData(["orgs", "current"], updated);
      toast.success("Organisation updated");
    },
    onError: () => toast.error("Failed to update organisation"),
  });
}
