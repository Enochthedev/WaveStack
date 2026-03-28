//! WebSocket client for the WaveStack stream-engine service.
//!
//! The desktop app maintains a persistent WebSocket connection to stream-engine
//! (ws://localhost:3400/ws?org_id=<org>) so it can:
//!   - Receive hype score updates in real time
//!   - Send stream metadata (audio_rms, chat_rate, viewer_delta) on an interval
//!   - Relay desktop commands (clip_now, scene_switch, send_alert)
//!
//! Connection state is stored in Tauri's managed state and accessible from any
//! Tauri command.

use std::sync::{Arc, Mutex};

/// Opaque connection handle — just tracks whether we have an active connection.
/// A real implementation would hold the WebSocket sink; this records the URL
/// and status so the UI can reflect connectivity.
#[derive(Default)]
pub struct StreamEngineState {
    pub url: Mutex<Option<String>>,
    pub connected: Mutex<bool>,
}

#[derive(serde::Serialize, Clone)]
pub struct WsConnectionInfo {
    pub connected: bool,
    pub url: Option<String>,
}

/// Connect to the stream-engine WebSocket.
///
/// In a full implementation this spawns a Tokio task that owns the ws sink/stream.
/// Here we record intent and return connection info for the UI.
#[tauri::command]
pub fn connect_stream_engine(
    state: tauri::State<'_, Arc<StreamEngineState>>,
    url: String,
) -> Result<WsConnectionInfo, String> {
    {
        let mut u = state.url.lock().map_err(|_| "lock poisoned")?;
        *u = Some(url.clone());
    }
    {
        let mut c = state.connected.lock().map_err(|_| "lock poisoned")?;
        *c = true;
    }
    Ok(WsConnectionInfo {
        connected: true,
        url: Some(url),
    })
}

/// Disconnect from stream-engine.
#[tauri::command]
pub fn disconnect_stream_engine(
    state: tauri::State<'_, Arc<StreamEngineState>>,
) -> WsConnectionInfo {
    if let Ok(mut c) = state.connected.lock() {
        *c = false;
    }
    if let Ok(mut u) = state.url.lock() {
        *u = None;
    }
    WsConnectionInfo {
        connected: false,
        url: None,
    }
}

/// Returns the current WebSocket connection status.
#[tauri::command]
pub fn stream_engine_status(
    state: tauri::State<'_, Arc<StreamEngineState>>,
) -> WsConnectionInfo {
    let connected = state.connected.lock().map(|c| *c).unwrap_or(false);
    let url = state.url.lock().ok().and_then(|u| u.clone());
    WsConnectionInfo { connected, url }
}

/// Push stream metadata to stream-engine.
///
/// In production this serialises the payload and sends it over the WebSocket
/// sink. Here we validate the payload shape and confirm dispatch.
#[tauri::command]
pub fn push_stream_metrics(
    state: tauri::State<'_, Arc<StreamEngineState>>,
    audio_rms: f64,
    chat_rate: f64,
    viewer_delta: f64,
) -> Result<(), String> {
    let connected = state.connected.lock().map(|c| *c).unwrap_or(false);
    if !connected {
        return Err("Not connected to stream-engine".to_string());
    }

    // Bounds check
    if !(0.0..=1.0).contains(&audio_rms) {
        return Err("audio_rms must be in [0.0, 1.0]".to_string());
    }

    // In a real implementation:
    //   sink.send(Message::Text(serde_json::to_string(&payload)?)).await?;
    // For now we log and succeed.
    println!(
        "[stream-ws] metrics audio_rms={audio_rms:.3} chat_rate={chat_rate:.1} viewer_delta={viewer_delta:.1}"
    );

    Ok(())
}
