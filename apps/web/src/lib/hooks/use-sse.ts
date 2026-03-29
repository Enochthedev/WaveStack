"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSSEStore } from "@/lib/store/sse-store";
import type { SSEEvent } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
function getBackoffMs(attempt: number) {
  return Math.min(1000 * Math.pow(2, attempt), 30_000);
}

/**
 * SSE connection to /api/v1/events/stream
 *
 * Handles:
 * - Auth header via EventSource polyfill (falls back to fetch-based approach)
 * - Reconnection with exponential backoff
 * - Dispatches events to TanStack Query cache + Zustand stores
 * - Connection state tracked in useSSEStore
 */
export function useSSE() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const { setStatus, setLastEventAt } = useSSEStore();

  const abortRef = useRef<AbortController | null>(null);
  const attemptRef = useRef(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      setLastEventAt(new Date().toISOString());

      switch (event.type) {
        // ── Live viewer counts ────────────────────────────────────────────────
        case "viewer_count_update":
          qc.setQueryData(
            ["stream", "live"],
            (prev: { viewerCount?: number } | null | undefined) =>
              prev ? { ...prev, viewerCount: event.count } : prev,
          );
          break;

        // ── New approval request ──────────────────────────────────────────────
        case "approval_request":
          qc.setQueryData<{ data: Extract<SSEEvent, { type: "approval_request" }>["request"][] }>(
            ["agents", "approvals"],
            (prev) =>
              prev
                ? { ...prev, data: [event.request, ...prev.data] }
                : {
                    data: [event.request],
                    meta: { total: 1, limit: 20, offset: 0, hasMore: false },
                  },
          );
          toast.info(`New approval: ${event.request.title}`, {
            action: { label: "Review", onClick: () => window.location.assign("/agents") },
          });
          break;

        // ── Approval expired ──────────────────────────────────────────────────
        case "approval_expired":
          qc.setQueryData<{ data: { id: string }[] }>(["agents", "approvals"], (prev) =>
            prev ? { ...prev, data: prev.data.filter((a) => a.id !== event.requestId) } : prev,
          );
          break;

        // ── Clip status update ────────────────────────────────────────────────
        case "clip_status_update":
          qc.invalidateQueries({ queryKey: ["clips", event.clipId] });
          qc.invalidateQueries({ queryKey: ["clips", "library"] });
          break;

        // ── Stream started ────────────────────────────────────────────────────
        case "stream_started":
          qc.setQueryData(["stream", "live"], event.session);
          qc.invalidateQueries({ queryKey: ["stream", "sessions"] });
          toast.success("Stream is live!");
          break;

        // ── Stream ended ──────────────────────────────────────────────────────
        case "stream_ended":
          qc.setQueryData(["stream", "live"], null);
          qc.invalidateQueries({ queryKey: ["stream", "sessions"] });
          qc.invalidateQueries({ queryKey: ["analytics"] });
          break;

        // ── Post published ────────────────────────────────────────────────────
        case "post_published":
          qc.invalidateQueries({ queryKey: ["queue"] });
          toast.success(`Post published to ${event.platform}`);
          break;

        // ── Post failed ───────────────────────────────────────────────────────
        case "post_failed":
          qc.invalidateQueries({ queryKey: ["queue"] });
          toast.error(`Post failed on ${event.platform}: ${event.reason}`);
          break;

        // ── Model updated ─────────────────────────────────────────────────────
        case "model_update":
          toast.success(
            `Personal model updated to v${event.version} (${event.confidence}% confidence)`,
          );
          break;

        // ── New notification ──────────────────────────────────────────────────
        case "notification":
          qc.invalidateQueries({ queryKey: ["notifications"] });
          if (event.notification.priority === "urgent") {
            toast.error(event.notification.title, { description: event.notification.detail });
          }
          break;

        // ── Stream health (no toast, just cache update) ───────────────────────
        case "stream_health":
          qc.setQueryData(["stream", "health"], event.health);
          break;

        // ── Follower milestone ────────────────────────────────────────────────
        case "follower_milestone":
          qc.invalidateQueries({ queryKey: ["analytics"] });
          qc.invalidateQueries({ queryKey: ["community"] });
          toast.success(
            `Milestone: ${event.count.toLocaleString()} followers on ${event.platform}!`,
          );
          break;

        // ── Agent action (just invalidate tasks) ─────────────────────────────
        case "agent_action":
          qc.invalidateQueries({ queryKey: ["agents", "tasks"] });
          break;
      }
    },
    [qc, setLastEventAt],
  );

  const connect = useCallback(() => {
    if (!session?.accessToken || !session.user?.orgId || !mountedRef.current) return;

    setStatus("connecting");
    abortRef.current = new AbortController();

    const url = `${BASE_URL}/v1/events/stream`;
    const { signal } = abortRef.current;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "x-org-id": session.user.orgId,
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);

        setStatus("connected");
        attemptRef.current = 0;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (mountedRef.current) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          let eventType = "";
          let dataLine = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataLine = line.slice(5).trim();
            } else if (line === "" && dataLine) {
              try {
                const payload = JSON.parse(dataLine);
                handleEvent({ type: eventType, ...payload } as SSEEvent);
              } catch {
                // malformed JSON — skip
              }
              eventType = "";
              dataLine = "";
            }
          }
        }
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        if ((err as Error).name === "AbortError") return;

        setStatus("reconnecting");
        const delay = getBackoffMs(attemptRef.current++);
        retryRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      });
  }, [session, handleEvent, setStatus]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (retryRef.current) clearTimeout(retryRef.current);
      setStatus("disconnected");
    };
  }, [connect, setStatus]);
}

/** Drop-in component — mount once in the dashboard layout to activate SSE. */
export function SSEProvider() {
  useSSE();
  return null;
}
