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

// ─── Revenue overview ─────────────────────────────────────────────────────────

export function useRevenueOverview() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["revenue", "overview"],
    queryFn: () => api.revenue.overview(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

// ─── Revenue history (monthly chart) ─────────────────────────────────────────

export function useRevenueHistory(months = 12) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["revenue", "history", months],
    queryFn: () => api.revenue.history(ctx!, months),
    enabled: !!ctx,
    staleTime: 30 * 60_000,
  });
}

// ─── Payouts ──────────────────────────────────────────────────────────────────

export function usePayouts(params?: { limit?: number; offset?: number; year?: number }) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["revenue", "payouts", params],
    queryFn: () => api.revenue.payouts(ctx!, params),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

// ─── Sponsors ─────────────────────────────────────────────────────────────────

export function useSponsors(params?: { status?: string }) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["revenue", "sponsors", params],
    queryFn: () => api.revenue.sponsors(ctx!, params),
    enabled: !!ctx,
    staleTime: 60_000,
  });
}

export function useCreateSponsor() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.revenue.createSponsor>[1]) =>
      api.revenue.createSponsor(ctx!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue", "sponsors"] });
      toast.success("Sponsor deal created");
    },
    onError: () => toast.error("Failed to create sponsor deal"),
  });
}

export function useUpdateSponsor() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string } & Parameters<typeof api.revenue.updateSponsor>[2]) =>
      api.revenue.updateSponsor(ctx!, id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue", "sponsors"] });
      toast.success("Sponsor deal updated");
    },
    onError: () => toast.error("Failed to update sponsor deal"),
  });
}

export function useDeleteSponsor() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revenue.deleteSponsor(ctx!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue", "sponsors"] });
      toast.success("Sponsor deal removed");
    },
    onError: () => toast.error("Failed to remove sponsor deal"),
  });
}

export function useCompleteDeliverable() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sponsorId, deliverableId }: { sponsorId: string; deliverableId: string }) =>
      api.revenue.completeDeliverable(ctx!, sponsorId, deliverableId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue", "sponsors"] });
      toast.success("Deliverable marked complete");
    },
    onError: () => toast.error("Failed to mark deliverable"),
  });
}
