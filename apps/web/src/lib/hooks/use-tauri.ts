"use client";

/**
 * Thin wrappers around Tauri commands for desktop-only features.
 * All functions gracefully return null/false when running in the browser.
 *
 * @tauri-apps/api is an optional peer dep — we only need it at runtime
 * inside the Tauri webview, so we import it dynamically and handle the
 * not-found case gracefully.
 */

// Detect whether we are inside the Tauri desktop app.
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type MediamtxStatus = {
  running: boolean;
  rtmp_port: number | null;
  api_port: number | null;
};

type WsConnectionInfo = {
  connected: boolean;
  url: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function invoke<T>(command: string, args?: Record<string, any>): Promise<T | null> {
  if (!isTauri) return null;
  try {
    // Dynamic import so the web bundle doesn't break when @tauri-apps/api is absent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import("@tauri-apps/api/core" as any);

    return mod.invoke(command, args) as Promise<T>;
  } catch {
    return null;
  }
}

// ─── Mediamtx ────────────────────────────────────────────────────────────────

export async function startMediamtx(
  rtmpPort = 1935,
  apiPort = 9997,
): Promise<MediamtxStatus | null> {
  return invoke<MediamtxStatus>("start_mediamtx", {
    rtmp_port: rtmpPort,
    api_port: apiPort,
  });
}

export async function stopMediamtx(): Promise<MediamtxStatus | null> {
  return invoke<MediamtxStatus>("stop_mediamtx");
}

export async function getMediamtxStatus(): Promise<MediamtxStatus | null> {
  return invoke<MediamtxStatus>("mediamtx_status");
}

// ─── Stream-engine WebSocket ──────────────────────────────────────────────────

export async function connectStreamEngine(url: string): Promise<WsConnectionInfo | null> {
  return invoke<WsConnectionInfo>("connect_stream_engine", { url });
}

export async function disconnectStreamEngine(): Promise<WsConnectionInfo | null> {
  return invoke<WsConnectionInfo>("disconnect_stream_engine");
}

export async function getStreamEngineStatus(): Promise<WsConnectionInfo | null> {
  return invoke<WsConnectionInfo>("stream_engine_status");
}

export async function pushStreamMetrics(
  audioRms: number,
  chatRate: number,
  viewerDelta: number,
): Promise<boolean> {
  const result = await invoke<void>("push_stream_metrics", {
    audio_rms: audioRms,
    chat_rate: chatRate,
    viewer_delta: viewerDelta,
  });
  return result !== null;
}

export async function getAppVersion(): Promise<string | null> {
  return invoke<string>("app_version");
}
