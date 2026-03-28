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

export function useTeamMembers() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["team", "members"],
    queryFn: () => api.team.members(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useTeamInvites() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["team", "invites"],
    queryFn: () => api.team.invites(ctx!),
    enabled: !!ctx,
    staleTime: 60_000,
  });
}

export function useInviteTeamMember() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      api.team.invite(ctx!, email, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", "invites"] });
      toast.success("Invite sent");
    },
    onError: () => toast.error("Failed to send invite"),
  });
}

export function useRevokeInvite() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => api.team.revokeInvite(ctx!, inviteId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", "invites"] });
      toast.success("Invite revoked");
    },
    onError: () => toast.error("Failed to revoke invite"),
  });
}

export function useUpdateTeamRole() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.team.updateRole(ctx!, memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", "members"] });
      toast.success("Role updated");
    },
    onError: () => toast.error("Failed to update role"),
  });
}

export function useRemoveTeamMember() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api.team.remove(ctx!, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team", "members"] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });
}
