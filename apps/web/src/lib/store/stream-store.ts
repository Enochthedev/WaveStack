/**
 * Live stream store — real-time state that changes second-by-second.
 * Populated by the SSE hook and the useStreamHealth polling hook.
 */
import { create } from "zustand";
import type { ChatMessage, StreamEvent, StreamHealth, StreamPlatformRelay } from "@/types";

const MAX_CHAT_MESSAGES = 500;
const MAX_STREAM_EVENTS = 200;

type StreamStore = {
  // ── Health ──────────────────────────────────────────────────────────────
  health: StreamHealth | null;
  setHealth: (h: StreamHealth) => void;

  // ── Per-platform relays ──────────────────────────────────────────────────
  relays: StreamPlatformRelay[];
  upsertRelay: (relay: StreamPlatformRelay) => void;
  updateRelayViewerCount: (platform: string, count: number) => void;

  // ── Chat messages ─────────────────────────────────────────────────────────
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;

  // ── Stream events (subs, raids, donations, etc.) ─────────────────────────
  streamEvents: StreamEvent[];
  addStreamEvent: (event: StreamEvent) => void;

  // ── Counters (updated from events) ───────────────────────────────────────
  subsToday: number;
  donationsToday: number;
  followersThisStream: number;
  bitsToday: number;
  incrementSubs: (n?: number) => void;
  incrementDonations: (n?: number) => void;
  incrementFollowers: (n?: number) => void;
  incrementBits: (n?: number) => void;
  resetCounters: () => void;
};

export const useStreamStore = create<StreamStore>((set) => ({
  // ── Health ─────────────────────────────────────────────────────────────────
  health: null,
  setHealth: (health) => set({ health }),

  // ── Relays ─────────────────────────────────────────────────────────────────
  relays: [],
  upsertRelay: (relay) =>
    set((s) => {
      const exists = s.relays.findIndex((r) => r.platform === relay.platform);
      if (exists >= 0) {
        const updated = [...s.relays];
        updated[exists] = relay;
        return { relays: updated };
      }
      return { relays: [...s.relays, relay] };
    }),
  updateRelayViewerCount: (platform, count) =>
    set((s) => ({
      relays: s.relays.map((r) => (r.platform === platform ? { ...r, viewerCount: count } : r)),
    })),

  // ── Chat ───────────────────────────────────────────────────────────────────
  chatMessages: [],
  addChatMessage: (msg) =>
    set((s) => {
      const updated = [...s.chatMessages, msg];
      return {
        chatMessages:
          updated.length > MAX_CHAT_MESSAGES
            ? updated.slice(updated.length - MAX_CHAT_MESSAGES)
            : updated,
      };
    }),
  clearChat: () => set({ chatMessages: [] }),

  // ── Stream events ──────────────────────────────────────────────────────────
  streamEvents: [],
  addStreamEvent: (event) =>
    set((s) => {
      const updated = [event, ...s.streamEvents];
      return {
        streamEvents:
          updated.length > MAX_STREAM_EVENTS ? updated.slice(0, MAX_STREAM_EVENTS) : updated,
      };
    }),

  // ── Counters ───────────────────────────────────────────────────────────────
  subsToday: 0,
  donationsToday: 0,
  followersThisStream: 0,
  bitsToday: 0,
  incrementSubs: (n = 1) => set((s) => ({ subsToday: s.subsToday + n })),
  incrementDonations: (n = 1) => set((s) => ({ donationsToday: s.donationsToday + n })),
  incrementFollowers: (n = 1) => set((s) => ({ followersThisStream: s.followersThisStream + n })),
  incrementBits: (n = 1) => set((s) => ({ bitsToday: s.bitsToday + n })),
  resetCounters: () =>
    set({
      subsToday: 0,
      donationsToday: 0,
      followersThisStream: 0,
      bitsToday: 0,
    }),
}));
