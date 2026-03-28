// Stream system types

export type StreamStatus = "idle" | "live" | "ended";

export type StreamEventType =
  | "audio_spike"
  | "chat_spike"
  | "viewer_delta"
  | "scene_change"
  | "clip_trigger"
  | "hype_moment"
  | "viewer_milestone";

export interface StreamSession {
  id: string;
  orgId: string;
  platform: string;
  streamKey: string | null;
  title: string | null;
  game: string | null;
  startedAt: string | null;
  endedAt: string | null;
  peakViewers: number | null;
  platformsRelayed: string[];
  vodUrl: string | null;
  status: StreamStatus;
  createdAt: string;
  events?: StreamEvent[];
}

export interface StreamEvent {
  id: string;
  streamSessionId: string;
  eventType: StreamEventType | string;
  timestamp: string;
  data: {
    audioRms?: number;
    chatRate?: number;
    viewerDelta?: number;
    sceneName?: string;
    hypeScore?: number;
    [key: string]: unknown;
  };
}

export interface StreamSignal {
  sessionId: string;
  orgId: string;
  eventType: StreamEventType;
  timestamp: string;
  audioRms?: number;
  chatRate?: number;
  viewerDelta?: number;
  sceneName?: string;
}

// Desktop app command types (sent from cloud → desktop via WebSocket)
export type DesktopCommand =
  | { action: "create_clip"; start: number; duration: number }
  | { action: "switch_scene"; scene: string }
  | { action: "send_chat"; platform: string; msg: string }
  | { action: "mute_mic" }
  | { action: "unmute_mic" }
  | { action: "go_live"; platforms: string[] }
  | { action: "end_stream" };

export interface Asset {
  id: string;
  orgId: string;
  projectId: string | null;
  title: string | null;
  description: string | null;
  mimeType: string | null;
  duration: number | null;
  sizeBytes: number | null;
  storagePath: string | null;
  cdnUrl: string | null;
  sourceStreamId: string | null;
  sourceStartSec: number | null;
  sourceEndSec: number | null;
  transcript: Record<string, unknown> | null;
  status: "pending" | "processing" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface ContentPerformance {
  id: string;
  orgId: string;
  platform: string;
  externalId: string;
  assetId: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeMinutes: number;
  ctr: number;
  fetchedAt: string;
}
