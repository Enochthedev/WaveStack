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

// ─── Notification list ────────────────────────────────────────────────────────

export function useNotifications(params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}) {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: () => api.notifications.list(ctx!, params),
    enabled: !!ctx,
    refetchInterval: 30_000,
  });
}

/** Just the unread count — cheap to poll often. */
export function useUnreadCount() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await api.notifications.list(ctx!, { unreadOnly: true, limit: 1 });
      return res.meta.total;
    },
    enabled: !!ctx,
    refetchInterval: 20_000,
  });
}

// ─── Mark read ────────────────────────────────────────────────────────────────

export function useMarkRead() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.notifications.markRead(ctx!, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(ctx!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
  });
}

// ─── Notification preferences ─────────────────────────────────────────────────

export function useNotificationPrefs() {
  const ctx = useAuthCtx();
  return useQuery({
    queryKey: ["notifications", "prefs"],
    queryFn: () => api.notifications.prefs(ctx!),
    enabled: !!ctx,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateNotificationPrefs() {
  const ctx = useAuthCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Parameters<typeof api.notifications.updatePrefs>[1]) =>
      api.notifications.updatePrefs(ctx!, prefs),
    onSuccess: (updated) => {
      qc.setQueryData(["notifications", "prefs"], updated);
      toast.success("Notification preferences saved");
    },
    onError: () => toast.error("Failed to save preferences"),
  });
}
