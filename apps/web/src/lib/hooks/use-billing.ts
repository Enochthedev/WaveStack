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

export function useBillingInfo() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["billing", "info"],
    queryFn: () => api.billing.info(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useInvoices(params?: { limit?: number; offset?: number }) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["billing", "invoices", params],
    queryFn: () => api.billing.invoices(ctx!, params),
    enabled: !!ctx,
    staleTime: 10 * 60_000,
  });
}

export function useUpgradePlan() {
  const ctx = useAuthCtx();
  return useMutation({
    mutationFn: ({ plan, cycle }: { plan: string; cycle: "monthly" | "annual" }) =>
      api.billing.upgrade(ctx!, plan, cycle),
    onSuccess: ({ checkoutUrl }) => {
      window.location.href = checkoutUrl;
    },
    onError: () => toast.error("Failed to start upgrade flow"),
  });
}

export function useCancelPlan() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.billing.cancel(ctx!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Plan cancelled — access continues until end of period");
    },
    onError: () => toast.error("Failed to cancel plan"),
  });
}
