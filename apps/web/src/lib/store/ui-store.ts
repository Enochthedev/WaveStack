/**
 * Global UI state — modals, sidebar, streamer-mode, command palette, filters.
 * Keep this flat and cheap — no API data lives here.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ModalId } from "@/types";

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type SidebarStore = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
};

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    { name: "ws-sidebar" },
  ),
);

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalStore = {
  open: ModalId;
  /** Optional payload passed when opening (e.g. the item to edit) */
  payload: unknown;
  openModal: (id: NonNullable<ModalId>, payload?: unknown) => void;
  closeModal: () => void;
};

export const useModalStore = create<ModalStore>((set) => ({
  open: null,
  payload: null,
  openModal: (open, payload = null) => set({ open, payload }),
  closeModal: () => set({ open: null, payload: null }),
}));

// ─── Command palette ──────────────────────────────────────────────────────────

type CommandStore = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

export const useCommandStore = create<CommandStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

// ─── Notifications panel ──────────────────────────────────────────────────────

type NotifPanelStore = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

export const useNotifPanelStore = create<NotifPanelStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

// ─── Clip library filters ─────────────────────────────────────────────────────

type ClipFilters = {
  status: string;
  platform: string;
  sortBy: string;
};

type ClipFilterStore = {
  filters: ClipFilters;
  setFilter: <K extends keyof ClipFilters>(key: K, value: ClipFilters[K]) => void;
  resetFilters: () => void;
};

const DEFAULT_CLIP_FILTERS: ClipFilters = {
  status: "all",
  platform: "all",
  sortBy: "newest",
};

export const useClipFilterStore = create<ClipFilterStore>((set) => ({
  filters: DEFAULT_CLIP_FILTERS,
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: DEFAULT_CLIP_FILTERS }),
}));

// ─── Analytics period ─────────────────────────────────────────────────────────

type AnalyticsPeriodStore = {
  period: "7d" | "30d" | "90d";
  setPeriod: (p: "7d" | "30d" | "90d") => void;
};

export const useAnalyticsPeriodStore = create<AnalyticsPeriodStore>()(
  persist(
    (set) => ({
      period: "30d",
      setPeriod: (period) => set({ period }),
    }),
    { name: "ws-analytics-period" },
  ),
);

// ─── Moderation filters ───────────────────────────────────────────────────────

type ModerationFilters = {
  status: "all" | "pending" | "actioned" | "dismissed";
  platform: string;
};

type ModerationFilterStore = {
  filters: ModerationFilters;
  setFilter: <K extends keyof ModerationFilters>(key: K, value: ModerationFilters[K]) => void;
};

export const useModerationFilterStore = create<ModerationFilterStore>((set) => ({
  filters: { status: "pending", platform: "all" },
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
}));

// ─── Agent task filters ───────────────────────────────────────────────────────

type AgentTaskFilters = {
  status: string;
  agentType: string;
  platform: string;
};

type AgentTaskFilterStore = {
  filters: AgentTaskFilters;
  setFilter: <K extends keyof AgentTaskFilters>(key: K, value: AgentTaskFilters[K]) => void;
  resetFilters: () => void;
};

const DEFAULT_TASK_FILTERS: AgentTaskFilters = {
  status: "all",
  agentType: "all",
  platform: "all",
};

export const useAgentTaskFilterStore = create<AgentTaskFilterStore>((set) => ({
  filters: DEFAULT_TASK_FILTERS,
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: DEFAULT_TASK_FILTERS }),
}));

// ─── Sponsor pipeline (local drag state) ─────────────────────────────────────

type SponsorPipelineStore = {
  expandedDealId: string | null;
  setExpandedDeal: (id: string | null) => void;
};

export const useSponsorPipelineStore = create<SponsorPipelineStore>((set) => ({
  expandedDealId: null,
  setExpandedDeal: (expandedDealId) => set({ expandedDealId }),
}));

// ─── Stream UI ────────────────────────────────────────────────────────────────

type StreamUIStore = {
  /** Which chat platform filter is active */
  chatFilter: string;
  setChatFilter: (p: string) => void;
  /** Auto-clip sensitivity slider value (1–10) */
  autoClipSensitivity: number;
  setAutoClipSensitivity: (v: number) => void;
  /** Whether agent chat responses are shown */
  showAgentMessages: boolean;
  toggleAgentMessages: () => void;
};

export const useStreamUIStore = create<StreamUIStore>((set) => ({
  chatFilter: "all",
  setChatFilter: (chatFilter) => set({ chatFilter }),
  autoClipSensitivity: 5,
  setAutoClipSensitivity: (autoClipSensitivity) => set({ autoClipSensitivity }),
  showAgentMessages: true,
  toggleAgentMessages: () => set((s) => ({ showAgentMessages: !s.showAgentMessages })),
}));

// ─── Content pipeline view ────────────────────────────────────────────────────

type ContentViewStore = {
  view: "kanban" | "list";
  setView: (v: "kanban" | "list") => void;
};

export const useContentViewStore = create<ContentViewStore>()(
  persist(
    (set) => ({
      view: "kanban",
      setView: (view) => set({ view }),
    }),
    { name: "ws-content-view" },
  ),
);
