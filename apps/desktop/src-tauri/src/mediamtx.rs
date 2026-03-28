//! Mediamtx sidecar process management.
//!
//! Mediamtx is the open-source RTMP relay. The desktop app bundles it as a
//! sidecar binary and manages its lifecycle.  The JS frontend calls the Tauri
//! commands exposed here to start/stop the relay and query its status.

use std::process::{Child, Command};
use std::sync::Mutex;

/// Shared state: the optional running mediamtx child process.
pub struct MediamtxState(pub Mutex<Option<Child>>);

#[derive(serde::Serialize)]
pub struct MediamtxStatus {
    pub running: bool,
    pub rtmp_port: Option<u16>,
    pub api_port: Option<u16>,
}

/// Start the mediamtx RTMP relay sidecar.
///
/// Looks for `mediamtx` on PATH or in the Tauri resource directory.
/// Returns an error string if the binary is not found or fails to start.
#[tauri::command]
pub fn start_mediamtx(
    state: tauri::State<'_, MediamtxState>,
    rtmp_port: u16,
    api_port: u16,
) -> Result<MediamtxStatus, String> {
    let mut guard = state.0.lock().map_err(|_| "state lock poisoned".to_string())?;

    if guard.is_some() {
        return Ok(MediamtxStatus {
            running: true,
            rtmp_port: Some(rtmp_port),
            api_port: Some(api_port),
        });
    }

    // Build an inline config and pass it via env vars supported by mediamtx.
    let child = Command::new("mediamtx")
        .env("MTX_RTMP", "yes")
        .env("MTX_RTMPADDRESS", format!(":{rtmp_port}"))
        .env("MTX_API", "yes")
        .env("MTX_APIADDRESS", format!("127.0.0.1:{api_port}"))
        .env("MTX_LOGLEVEL", "warn")
        .spawn()
        .map_err(|e| format!("Failed to start mediamtx: {e}. Is mediamtx installed and on PATH?"))?;

    *guard = Some(child);

    Ok(MediamtxStatus {
        running: true,
        rtmp_port: Some(rtmp_port),
        api_port: Some(api_port),
    })
}

/// Stop the running mediamtx process.
#[tauri::command]
pub fn stop_mediamtx(state: tauri::State<'_, MediamtxState>) -> Result<MediamtxStatus, String> {
    let mut guard = state.0.lock().map_err(|_| "state lock poisoned".to_string())?;

    if let Some(mut child) = guard.take() {
        child.kill().map_err(|e| format!("Failed to kill mediamtx: {e}"))?;
    }

    Ok(MediamtxStatus {
        running: false,
        rtmp_port: None,
        api_port: None,
    })
}

/// Query whether mediamtx is currently running.
#[tauri::command]
pub fn mediamtx_status(state: tauri::State<'_, MediamtxState>) -> MediamtxStatus {
    let mut guard = state.0.lock().unwrap_or_else(|e| e.into_inner());

    // Check if the child process has exited unexpectedly.
    if let Some(child) = guard.as_mut() {
        if let Ok(Some(_)) = child.try_wait() {
            // Process exited — clear the state.
            *guard = None;
        }
    }

    MediamtxStatus {
        running: guard.is_some(),
        rtmp_port: None,
        api_port: None,
    }
}
