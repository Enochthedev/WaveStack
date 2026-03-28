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

// ─── Workflows ────────────────────────────────────────────────────────────────

export function useWorkflows() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.workflows.list(ctx!),
    enabled: !!ctx,
    staleTime: 30_000,
  });
}

export function useWorkflow(id: string | null) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["workflows", id],
    queryFn: () => api.workflows.get(ctx!, id!),
    enabled: !!ctx && !!id,
  });
}

export function useCreateWorkflow() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof api.workflows.create>[1]) =>
      api.workflows.create(ctx!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow created");
    },
    onError: () => toast.error("Failed to create workflow"),
  });
}

export function useUpdateWorkflow() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Parameters<typeof api.workflows.update>[2]) =>
      api.workflows.update(ctx!, id, patch),
    onSuccess: (updated) => {
      qc.setQueryData(["workflows", updated.id], updated);
      qc.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: () => toast.error("Failed to update workflow"),
  });
}

export function useDeleteWorkflow() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.workflows.delete(ctx!, id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ["workflows", id] });
      qc.invalidateQueries({ queryKey: ["workflows"] });
      toast.success("Workflow deleted");
    },
    onError: () => toast.error("Failed to delete workflow"),
  });
}

export function useRunWorkflow() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.workflows.run(ctx!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflows", "runs"] });
      toast.success("Workflow triggered");
    },
    onError: () => toast.error("Failed to trigger workflow"),
  });
}

// ─── Workflow run history ─────────────────────────────────────────────────────

export function useWorkflowRuns(params?: { limit?: number; offset?: number }) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["workflows", "runs", params],
    queryFn: () => api.workflows.runs(ctx!, params),
    enabled: !!ctx,
    staleTime: 30_000,
  });
}

// ─── Skills (org-owned) ──────────────────────────────────────────────────────

export function useSkills() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["skills"],
    queryFn: () => api.skills.list(ctx!),
    enabled: !!ctx,
    staleTime: 60_000,
  });
}

export function useSkill(id: string | null) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["skills", id],
    queryFn: () => api.skills.get(ctx!, id!),
    enabled: !!ctx && !!id,
  });
}

export function useCreateSkill() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; description?: string; category: string }) =>
      api.skills.create(ctx!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill created");
    },
    onError: () => toast.error("Failed to create skill"),
  });
}

export function useUpdateSkill() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      description?: string;
      category?: string;
    }) => api.skills.update(ctx!, id, patch),
    onSuccess: (updated) => {
      qc.setQueryData(["skills", updated.id], updated);
      qc.invalidateQueries({ queryKey: ["skills"] });
    },
    onError: () => toast.error("Failed to update skill"),
  });
}

export function useDeleteSkill() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.skills.delete(ctx!, id),
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ["skills", id] });
      qc.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill deleted");
    },
    onError: () => toast.error("Failed to delete skill"),
  });
}

export function usePublishSkill() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.skills.publish(ctx!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      toast.success("Skill published to marketplace");
    },
    onError: () => toast.error("Failed to publish skill"),
  });
}

export function useExecuteSkill() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      input?: Record<string, any>;
      versionId?: string;
      sync?: boolean;
    }) => api.skills.execute(ctx!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["executions"] });
      toast.success("Skill execution started");
    },
    onError: () => toast.error("Failed to execute skill"),
  });
}

// ─── Marketplace ─────────────────────────────────────────────────────────────

export function useMarketplaceSkills(category?: string) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["marketplace", category],
    queryFn: () => api.marketplace.browse(ctx!, category ? { category } : undefined),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useInstallSkill() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.marketplace.install(ctx!, id),
    onSuccess: (installed) => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      toast.success(`Skill installed: ${installed.name}`);
    },
    onError: () => toast.error("Failed to install skill"),
  });
}

export function useForkSkill() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.marketplace.fork(ctx!, id),
    onSuccess: (forked) => {
      qc.invalidateQueries({ queryKey: ["skills"] });
      toast.success(`Skill forked: ${forked.name}`);
    },
    onError: () => toast.error("Failed to fork skill"),
  });
}

export function useRateSkill() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; rating: number; review?: string }) =>
      api.marketplace.rate(ctx!, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      toast.success("Rating submitted");
    },
    onError: () => toast.error("Failed to rate skill"),
  });
}

// ─── Skill Executions ────────────────────────────────────────────────────────

export function useExecutions() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["executions"],
    queryFn: () => api.executions.list(ctx!),
    enabled: !!ctx,
    staleTime: 10_000,
  });
}

export function useExecution(id: string | null) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["executions", id],
    queryFn: () => api.executions.get(ctx!, id!),
    enabled: !!ctx && !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll while running
      return status === "running" || status === "pending" ? 2000 : false;
    },
  });
}

export function useCancelExecution() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.executions.cancel(ctx!, id),
    onSuccess: (updated) => {
      qc.setQueryData(["executions", updated.id], updated);
      qc.invalidateQueries({ queryKey: ["executions"] });
      toast.success("Execution cancelled");
    },
    onError: () => toast.error("Failed to cancel execution"),
  });
}
