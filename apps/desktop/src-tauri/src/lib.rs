use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

// ── Tauri commands (callable from JS via invoke()) ─────────────────────────

/// Returns the desktop app version — useful for update checks.
#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Show or hide the main window (toggle from tray).
#[tauri::command]
fn toggle_window<R: Runtime>(app: tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

// ── App entry point ────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ───────────────────────────────────────────────────────
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        // Single-instance guard: if the user opens a second WaveStack window,
        // focus the existing one instead of launching a duplicate.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.set_focus();
            }
        }))
        // Optionally start WaveStack at login (user can toggle in Settings).
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        // ── Commands ──────────────────────────────────────────────────────
        .invoke_handler(tauri::generate_handler![app_version, toggle_window])
        // ── Setup ─────────────────────────────────────────────────────────
        .setup(|app| {
            build_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running WaveStack desktop app");
}

// ── System tray ───────────────────────────────────────────────────────────

fn build_tray<R: Runtime>(app: &mut tauri::App<R>) -> tauri::Result<()> {
    let show_item   = MenuItem::with_id(app, "show",   "Show WaveStack", true, None::<&str>)?;
    let upload_item = MenuItem::with_id(app, "upload", "Upload VOD…",    true, None::<&str>)?;
    let quit_item   = MenuItem::with_id(app, "quit",   "Quit",           true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &upload_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("WaveStack")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "upload" => {
                // Navigate to the uploads page and bring window to front.
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.eval("window.location.href='/uploads'");
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Single-click the tray icon → toggle window.
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    if win.is_visible().unwrap_or(false) {
                        let _ = win.hide();
                    } else {
                        let _ = win.show();
                        let _ = win.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
