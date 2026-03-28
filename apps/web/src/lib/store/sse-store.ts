/**
 * SSE connection state — tiny store so any component can read connection health.
 */
import { create } from "zustand";
import type { SSEConnectionState } from "@/types";

type SSEStore = {
  status: SSEConnectionState;
  lastEventAt: string | null;
  setStatus: (s: SSEConnectionState) => void;
  setLastEventAt: (at: string) => void;
};

export const useSSEStore = create<SSEStore>((set) => ({
  status: "disconnected",
  lastEventAt: null,
  setStatus: (status) => set({ status }),
  setLastEventAt: (lastEventAt) => set({ lastEventAt }),
}));
