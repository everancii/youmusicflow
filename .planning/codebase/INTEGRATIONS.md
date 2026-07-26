# Integrations

**Analysis Date:** 2026-07-26

## External Services

**YouTube Music (primary integration):**
- What: `https://music.youtube.com` loaded directly into the main BrowserWindow (`src/main.ts` line ~87)
- Auth: user's own Google session inside the embedded Chromium (cookies in Electron session partition, default session)
- Control surface: DOM manipulation via preload script — no official API
  - `src/client/controls.ts` queries `#play-pause-button`, `ytmusic-player-queue-item[selected]`, `ytmusic-play-button-renderer`
  - Fragile by design: breaks whenever YouTube Music changes its DOM
- CSS injection: scrollbars hidden via `webContents.insertCSS` (main) + `<style>` element (preload)

**Microsoft Store (distribution):**
- AppX target in `package.json` build config
- Updates delegated to Store — in-app auto-update removed (comment in `src/main.ts`)
- AppX identity placeholders not yet filled (`publisher: CN=YourPartnerCenterPublisher`)
- Open change: `openspec/changes/microsoft-store-release-build/`

**S3 binary publishing (documented, not in config):**
- AGENTS.md mentions `youmusicflow-binaries` bucket (`ap-northeast-1`) — no `publish` block currently in `package.json`; treat as stale/aspirational

## IPC Surface (internal integration boundary)

**Main → YouTube Music renderer (send):**
- `play/pause`, `prev`, `next` — `IPCEventNames` enum in `src/types/ipc.ts`, triggered by `globalShortcut` media keys in `src/main.ts`

**Settings renderer → Main (invoke/send):**
- `get-settings` (invoke) — returns full settings object
- `get-platform` (invoke) — returns `process.platform`
- `get-app-version` (invoke) — returns app version
- `update-setting` (send) — key/value; main applies side effects (alwaysOnTop, startOnLogin, windowPosition, hideDockIcon)

**In-process events:**
- `app.emit('open-settings')` from tray context menu (`src/ui/contextTemplate.ts`) — opens settings BrowserWindow

## OS Integrations

- **Global media keys:** `globalShortcut.register('MediaPlayPause'|'MediaPreviousTrack'|'MediaNextTrack')` — system-wide capture
- **Tray:** icon adapts to macOS dark/light (`src/tools/getNativeIconName.ts`); click shows window, right-click shows context menu
- **Login item:** `app.setLoginItemSettings` driven by `startOnLogin` setting
- **macOS dock:** icon set explicitly; hide/show via `hideDockIcon` setting; `LSUIElement: 1` at package level

## Webhooks / Databases / Auth Providers

- None. No server-side components, no databases, no API keys.

---

*Integration analysis: 2026-07-26*
