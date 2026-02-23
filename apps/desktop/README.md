# WaveStack Desktop

Native desktop app for macOS, Windows, and Linux built with **Tauri v2** (Rust shell + Next.js frontend).

---

## Table of contents

1. [Why Tauri?](#1-why-tauri)
2. [How it works](#2-how-it-works)
3. [Project structure](#3-project-structure)
4. [Prerequisites](#4-prerequisites)
5. [Development](#5-development)
6. [Coding guide](#6-coding-guide)
7. [Next.js ↔ Tauri integration](#7-nextjs--tauri-integration)
8. [Building for production](#8-building-for-production)
9. [Code signing & notarization](#9-code-signing--notarization)
10. [CI / CD](#10-ci--cd)
11. [Environment variables](#11-environment-variables)
12. [Known limitations & gotchas](#12-known-limitations--gotchas)
13. [Quick reference](#13-quick-reference)

---

## 1. Why Tauri?

WaveStack Desktop targets streamers who are CPU/GPU-bound during a live stream. A heavy app that idles at 1–3% CPU and 150–300 MB RAM noticeably degrades encoding. Tauri uses the OS-native WebView instead of bundling Chromium:

| | Tauri v2 | Electron |
|---|---|---|
| **Renderer** | OS WebView (WKWebView / WebView2 / WebKitGTK) | Bundled Chromium |
| **Binary size** | 8–15 MB | 150–200 MB |
| **Idle RAM** | 30–60 MB | 150–300 MB |
| **Idle CPU** | ~0% | 1–3% |
| **Security model** | Capability allowlist per window | All Node APIs exposed by default |
| **Backend language** | Rust | Node.js |

**The trade-off:** the three OS WebViews are not identical. Occasional rendering differences (mainly CSS or font rendering) require platform-specific fixes. For WaveStack this is acceptable.

---

## 2. How it works

```
┌─────────────────────────────────┐
│          Tauri process           │
│                                 │
│  ┌──────────────────────────┐   │
│  │   WebView (OS-native)    │   │
│  │  Next.js static export   │   │  ◄── same code as apps/web
│  │  (or :3000 in dev)       │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │       Rust core          │   │
│  │  • System tray           │   │
│  │  • Window management     │   │
│  │  • Single-instance guard │   │
│  │  • Auto-start            │   │
│  │  • Native notifications  │   │
│  │  • invoke() commands     │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
            │  HTTP
            ▼
     core-app (Fastify)      ◄── same backend the web app calls
```

In production, Tauri bundles the static Next.js output (`apps/web/out`) directly into the binary. In development, the WebView points at `http://localhost:3000` so hot-reload works.

All real data fetching goes to the `core-app` backend over HTTP — no Next.js server runs inside the desktop app.

---

## 3. Project structure

```
apps/desktop/
├── package.json                 # "wavestack-desktop" — Tauri CLI scripts
└── src-tauri/
    ├── tauri.conf.json          # Window, tray, bundle, and build config
    ├── Cargo.toml               # Rust crate definition + release profile
    ├── build.rs                 # Tauri code-generation (do not delete)
    ├── capabilities/
    │   └── default.json         # API permission allowlist for the main window
    └── src/
        ├── main.rs              # Binary entry point — calls lib::run()
        └── lib.rs               # Everything: plugins, tray, commands
```

### `tauri.conf.json` — key fields

```jsonc
{
  "build": {
    // Runs before `tauri dev` opens the window (starts Next.js on :3000)
    "beforeDevCommand": "pnpm --filter web dev",
    "devUrl": "http://localhost:3000",

    // Runs before `tauri build` (exports Next.js to web/out)
    "beforeBuildCommand": "pnpm --filter web build",
    "frontendDist": "../../web/out"   // bundled into the binary
  },
  "app": {
    "windows": [{
      "width": 1440, "height": 900,
      "minWidth": 1024, "minHeight": 640,
      "titleBarStyle": "Overlay"      // native macOS traffic lights
    }]
  }
}
```

### `capabilities/default.json` — permission model

Tauri v2 blocks every API by default. Only what's listed here can be called from the frontend:

```json
{
  "windows": ["main"],
  "permissions": [
    "core:default",              // window management, app handle
    "shell:allow-open",          // open URLs in the system browser
    "notification:default",      // send native notifications
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled"
  ]
}
```

### `Cargo.toml` — release profile

```toml
[profile.release]
codegen-units = 1    # single unit → cross-module optimisation
lto           = true # link-time optimisation → smaller binary
opt-level     = "s"  # optimise for size, not speed
panic         = "abort"
strip         = true # strip debug symbols
```

This gives ~30–40% smaller binaries vs. a default release build. Changing `opt-level` to `"3"` would not meaningfully help — the Rust layer is just a thin shell; CPU-bound work happens in JavaScript or the backend.

---

## 4. Prerequisites

### All platforms

| Tool | Minimum version | Install |
|---|---|---|
| Node.js | 20 | [nodejs.org](https://nodejs.org) |
| pnpm | 9 | `npm i -g pnpm` |
| Rust (stable) | 1.77.2 | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |

### macOS

- Xcode Command Line Tools: `xcode-select --install`
- Minimum deployment target: macOS 12 (Monterey)

### Windows

- **WebView2 Runtime** — included in Windows 11; on Windows 10 download from Microsoft.
- **Visual Studio Build Tools** with the "Desktop development with C++" workload.
- **NSIS** (for the `.exe` installer target): `winget install NSIS.NSIS`

### Linux (Debian / Ubuntu)

```bash
sudo apt update && sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl wget file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

For other distros (Fedora, Arch, NixOS) see the [Tauri prerequisites page](https://tauri.app/start/prerequisites/).

---

## 5. Development

### First run

```bash
# From the monorepo root — install everything
pnpm install

# Start the desktop app (also starts Next.js on :3000 automatically)
pnpm --filter wavestack-desktop dev
```

Or from inside this directory:

```bash
cd apps/desktop
pnpm dev
```

Tauri will:
1. Run `pnpm --filter web dev` (the `beforeDevCommand`).
2. Wait until `http://localhost:3000` responds.
3. Compile the Rust crate (first compile takes 1–3 min; subsequent incremental compiles are fast).
4. Open the native window.

### Hot reload behaviour

| Change type | Behaviour |
|---|---|
| UI / TypeScript / CSS | Instant hot-reload (Next.js HMR, no Rust recompile) |
| `lib.rs` or `Cargo.toml` | Tauri detects the change, recompiles Rust, and relaunches the window |
| `tauri.conf.json` | Restart `pnpm dev` manually |
| `capabilities/default.json` | Restart `pnpm dev` manually |

### DevTools

In a debug build, right-click anywhere in the window → **Inspect Element** opens the WebView DevTools. DevTools are disabled in release builds.

To force-enable them in a release build (for internal testing only), add to `tauri.conf.json`:

```json
"app": {
  "windows": [{ "devtools": true }]
}
```

Remove this before shipping to users.

---

## 6. Coding guide

### Adding a Rust command

A "command" is a Rust function the JavaScript side can call via `invoke()`.

**Step 1 — write the function in `src/lib.rs`:**

```rust
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "os":   std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    })
}
```

Return any type that implements `serde::Serialize`. For errors, return `Result<T, String>`:

```rust
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}
```

**Step 2 — register it in `run()`:**

```rust
.invoke_handler(tauri::generate_handler![
    app_version,
    toggle_window,
    get_system_info,   // ← add here
    read_file,
])
```

**Step 3 — add the permission (if required):**

Some commands need explicit capability entries. If your command uses a Tauri plugin API (filesystem, dialog, etc.), add the relevant `allow-*` string to `capabilities/default.json`.

**Step 4 — call from TypeScript:**

```ts
import { invoke } from "@tauri-apps/api/core";

const info = await invoke<{ os: string; arch: string }>("get_system_info");
console.log(info.os); // "macos" / "windows" / "linux"
```

### Adding a tray menu item

In `build_tray()` inside `lib.rs`:

```rust
// 1. Create the item
let clips_item = MenuItem::with_id(app, "clips", "Open Clips…", true, None::<&str>)?;

// 2. Add to the menu
let menu = Menu::with_items(app, &[&show_item, &clips_item, &upload_item, &quit_item])?;

// 3. Handle the event
.on_menu_event(|app, event| match event.id.as_ref() {
    "clips" => {
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.eval("window.location.href='/clips'");
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
    // ... existing arms
})
```

### Adding a Tauri plugin

1. Add to `Cargo.toml`:
   ```toml
   tauri-plugin-dialog = "2"
   ```
2. Register in `run()`:
   ```rust
   .plugin(tauri_plugin_dialog::init())
   ```
3. Add permissions to `capabilities/default.json`:
   ```json
   "dialog:allow-open",
   "dialog:allow-save"
   ```
4. Install the TypeScript bindings:
   ```bash
   pnpm --filter web add @tauri-apps/plugin-dialog
   ```
5. Use from the frontend:
   ```ts
   import { open } from "@tauri-apps/plugin-dialog";
   const path = await open({ filters: [{ name: "Video", extensions: ["mp4", "mov"] }] });
   ```

### Sending a native notification

```rust
// From Rust (e.g. after a background task completes)
use tauri_plugin_notification::NotificationExt;
app.notification()
   .builder()
   .title("Upload complete")
   .body("Your VOD has been uploaded to YouTube.")
   .show()
   .unwrap();
```

Or from TypeScript:

```ts
import { sendNotification } from "@tauri-apps/plugin-notification";
await sendNotification({ title: "Upload complete", body: "VOD uploaded to YouTube." });
```

Requires `notification:default` in `capabilities/default.json` (already there).

---

## 7. Next.js ↔ Tauri integration

### Detecting the desktop context

Some UI should only show inside the desktop app (e.g. tray controls, "auto-start" toggle):

```ts
import { isTauri } from "@tauri-apps/api/core";

const isDesktop = await isTauri(); // false on web, true inside Tauri
```

Or use a synchronous check for SSR-safe code:

```ts
const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
```

### Static export requirement

Tauri bundles the output of `next build` (which writes to `apps/web/out/`). This is a **static export** — no Node.js runtime runs inside the desktop app.

`apps/web/next.config.ts` must have:

```ts
const nextConfig: NextConfig = {
  output: "export",
  // ...
};
```

Consequences:

- **Next.js API routes** (`app/api/**`) do not run inside the desktop app. All data fetching must target the `core-app` Fastify backend.
- **Server Components** that fetch at request time are pre-rendered at build time with whatever data was available during `next build`. For real-time data, use client components that fetch on mount.
- **Dynamic routes** that depend on runtime data need `generateStaticParams()` or must be client-rendered.

### Routing

The Next.js static export generates a directory of `.html` files. The `trailingSlash: true` option in `next.config.ts` ensures clean URLs work correctly when Tauri loads the files directly (no server to rewrite paths).

### API base URL

Use `NEXT_PUBLIC_API_URL` to point at the right backend:

```bash
# .env.local (development — core-app running locally)
NEXT_PUBLIC_API_URL=http://localhost:3000

# .env.production.desktop (bundled into the desktop build)
NEXT_PUBLIC_API_URL=https://api.wavestack.io
```

Pass the right env file when building for desktop:

```bash
NEXT_PUBLIC_API_URL=https://api.wavestack.io pnpm --filter wavestack-desktop build
```

---

## 8. Building for production

```bash
# From the monorepo root
pnpm --filter wavestack-desktop build

# With a specific API URL
NEXT_PUBLIC_API_URL=https://api.wavestack.io pnpm --filter wavestack-desktop build

# Debug build (DevTools enabled, no binary stripping)
pnpm --filter wavestack-desktop tauri build --debug
```

Tauri:
1. Runs `pnpm --filter web build` (Next.js → `apps/web/out`).
2. Compiles `src-tauri/` in release mode with the optimised profile.
3. Bundles everything into platform installers.

### Output locations

| Platform | Artifact | Path |
|---|---|---|
| macOS | `.app` bundle | `src-tauri/target/release/bundle/macos/WaveStack.app` |
| macOS | `.dmg` | `src-tauri/target/release/bundle/dmg/WaveStack_x.x.x_x64.dmg` |
| Windows | `.msi` | `src-tauri/target/release/bundle/msi/WaveStack_x.x.x_x64_en-US.msi` |
| Windows | `.exe` (NSIS) | `src-tauri/target/release/bundle/nsis/WaveStack_x.x.x_x64-setup.exe` |
| Linux | `.deb` | `src-tauri/target/release/bundle/deb/wavestack_x.x.x_amd64.deb` |
| Linux | `.AppImage` | `src-tauri/target/release/bundle/appimage/wavestack_x.x.x_amd64.AppImage` |
| Linux | `.rpm` | `src-tauri/target/release/bundle/rpm/wavestack-x.x.x-1.x86_64.rpm` |

### Versioning

The version in `Cargo.toml` and `tauri.conf.json` must match. Bump both together:

```bash
# tauri.conf.json
"version": "0.2.0"

# Cargo.toml
version = "0.2.0"
```

### Cross-compilation

Tauri does not cross-compile natively. Each platform must be built on its own OS. Use the GitHub Actions matrix below for CI.

---

## 9. Code signing & notarization

### macOS

1. Enroll in the **Apple Developer Program** ($99/year at developer.apple.com).
2. Create a **Developer ID Application** certificate in Xcode → Settings → Accounts → Manage Certificates.
3. Add to `tauri.conf.json`:
   ```json
   "bundle": {
     "macOS": {
       "signingIdentity": "Developer ID Application: Your Name (XXXXXXXXXX)"
     }
   }
   ```
4. For **notarization** (required to distribute outside the Mac App Store without a Gatekeeper warning):
   - Create an app-specific password at appleid.apple.com.
   - Set env vars before building:
     ```bash
     APPLE_ID=you@example.com \
     APPLE_PASSWORD=xxxx-xxxx-xxxx-xxxx \
     APPLE_TEAM_ID=XXXXXXXXXX \
     pnpm --filter wavestack-desktop build
     ```
   - Tauri automatically submits to Apple's notary service and staples the ticket.

Without signing, macOS shows "app can't be opened because it's from an unidentified developer." Users can bypass with right-click → Open, but this is a bad experience for public releases.

### Windows

1. Purchase a **code-signing certificate** from a CA (DigiCert, Sectigo, GlobalSign). For SmartScreen trust from day one, use an **EV (Extended Validation)** certificate.
2. Add to `tauri.conf.json`:
   ```json
   "bundle": {
     "windows": {
       "certificateThumbprint": "AABBCCDDEEFF...",
       "digestAlgorithm": "sha256",
       "timestampUrl": "http://timestamp.digicert.com"
     }
   }
   ```
3. In CI, store the `.pfx` as a base64 secret and decode it before building.

Without signing, Windows SmartScreen shows "Windows protected your PC." Users can click "More info → Run anyway."

### Linux

Linux does not have a mandatory code-signing requirement. For `.AppImage`, you can sign with GPG; for `.deb`, sign the repository with a GPG key so users can verify the package via `apt`.

---

## 10. CI / CD

No GitHub Actions are set up yet. Below is a production-ready starting point.

Create `.github/workflows/desktop.yml`:

```yaml
name: Desktop build

on:
  push:
    tags: ["v*"]

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: "--target aarch64-apple-darwin"   # Apple Silicon
          - platform: macos-latest
            args: "--target x86_64-apple-darwin"    # Intel Mac
          - platform: windows-latest
            args: ""
          - platform: ubuntu-22.04
            args: ""

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with: { version: 9 }

      - name: Install Node.js
        uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }

      - name: Install Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Cache Rust
        uses: swatinem/rust-cache@v2
        with:
          workspaces: apps/desktop/src-tauri

      - name: Install Linux system dependencies
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt update && sudo apt install -y \
            libwebkit2gtk-4.1-dev build-essential curl wget file \
            libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev

      - name: Install JS dependencies
        run: pnpm install

      - name: Build & bundle
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN:           ${{ secrets.GITHUB_TOKEN }}
          # macOS signing
          APPLE_CERTIFICATE:          ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY:     ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID:                   ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD:             ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID:              ${{ secrets.APPLE_TEAM_ID }}
          # Windows signing
          WINDOWS_CERTIFICATE:          ${{ secrets.WINDOWS_CERTIFICATE }}
          WINDOWS_CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
          # App
          NEXT_PUBLIC_API_URL: https://api.wavestack.io
        with:
          projectPath: apps/desktop
          args:        ${{ matrix.args }}
          tagName:     "v__VERSION__"
          releaseName: "WaveStack v__VERSION__"
          releaseBody: "See CHANGELOG for details."
          releaseDraft: true
```

`tauri-action` handles creating a GitHub Release and uploading all artifacts when the job runs on a version tag.

---

## 11. Environment variables

| Variable | Where used | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `next build` | Backend API base URL embedded in the static export |
| `APPLE_CERTIFICATE` | CI macOS build | Base64-encoded `.p12` signing certificate |
| `APPLE_CERTIFICATE_PASSWORD` | CI macOS build | Password for the `.p12` |
| `APPLE_SIGNING_IDENTITY` | CI macOS build | Certificate common name |
| `APPLE_ID` | CI macOS build | Apple ID for notarization |
| `APPLE_PASSWORD` | CI macOS build | App-specific password for notarization |
| `APPLE_TEAM_ID` | CI macOS build | Apple Developer Team ID |
| `WINDOWS_CERTIFICATE` | CI Windows build | Base64-encoded `.pfx` certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | CI Windows build | Password for the `.pfx` |

Store secrets in your CI provider (GitHub → Settings → Secrets). Never commit them to the repository.

---

## 12. Known limitations & gotchas

### No Next.js API routes in production

The desktop app bundles a static HTML/CSS/JS export. There is no Node.js runtime. `app/api/**` routes are skipped during `next build` with `output: "export"`. All backend calls must go to `core-app`.

### WebView rendering differences

| Platform | WebView engine | Quirks |
|---|---|---|
| macOS | WKWebView (Safari-based) | Best CSS support; most similar to web |
| Windows | WebView2 (Chromium-based) | Very close to Chrome; occasional font rendering differences |
| Linux | WebKitGTK | Oldest engine; CSS variables occasionally render differently; some animations may be janky |

Test the app on all three before each release. Use `pnpm tauri info` to see which WebView version is installed.

### WebView2 not pre-installed on Windows 10

Windows 11 ships WebView2 by default. On Windows 10, some users may not have it. The `tauri-action` build can include a WebView2 bootstrapper in the NSIS installer — add to `tauri.conf.json`:

```json
"bundle": {
  "windows": {
    "webviewInstallMode": { "type": "downloadBootstrapper" }
  }
}
```

This downloads and installs WebView2 automatically during app setup.

### Linux system tray

The tray icon requires `libayatana-appindicator`. On GNOME (the default Ubuntu desktop), the tray area is hidden by default — users need the [AppIndicator and KStatusNotifierItem Support](https://extensions.gnome.org/extension/615/appindicator-support/) extension. Document this clearly in your Linux install instructions.

### Single-instance plugin on Linux

`tauri-plugin-single-instance` uses a local socket. It works on all major Linux DEs but may behave unexpectedly in sandboxed environments (Flatpak, Snap).

### `--minimized` flag on macOS

`tauri_plugin_autostart` passes `["--minimized"]` when launching at login. The `lib.rs` setup does not yet read this flag to hide the window on launch — it must be wired up:

```rust
.setup(|app| {
    let args: Vec<String> = std::env::args().collect();
    if !args.contains(&"--minimized".to_string()) {
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.show();
        }
    }
    build_tray(app)?;
    Ok(())
})
```

Until this is done, the window always opens on login even when auto-start is enabled.

---

## 13. Quick reference

```bash
# Install all workspace dependencies
pnpm install

# Dev (desktop + Next.js hot-reload on :3000)
pnpm --filter wavestack-desktop dev

# Production build
pnpm --filter wavestack-desktop build

# Debug build (DevTools enabled, symbols not stripped)
pnpm --filter wavestack-desktop tauri build --debug

# Print Tauri + system environment info
pnpm --filter wavestack-desktop tauri info

# Regenerate icon set from a 1024×1024 source PNG
pnpm --filter wavestack-desktop tauri icon path/to/icon.png

# Run just the Rust compiler check (no full Tauri build)
cd apps/desktop/src-tauri && cargo check

# Clean Rust build artifacts
cd apps/desktop/src-tauri && cargo clean
```
