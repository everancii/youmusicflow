# AGENTS.md — YouMusicFlow

Electron desktop app that wraps [YouTube Music](https://music.youtube.com) in a compact, frameless, tray-based mini-player. Cross-platform (macOS, Windows, Linux).

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Compiles TypeScript (`src/` → `app/`) then copies settings UI + offline page assets via `copy-assets.js` |
| `npm start` | Builds then launches Electron (`app/main.js`) |
| `npm run watch` | Watches and recompiles TypeScript on change |
| `npm test` | Runs Jest with `ts-jest` preset, verbose output |
| `npm run test:coverage` | Jest with coverage collection |
| `npm run format` | Prettier on `src/**/*.{js,ts}` (writes in-place) |
| `npm run dist` | Packages distributable with `electron-builder` → `release/` |
| `npm run pack` | Packages into a directory (no installer) |

CI: GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci` → build → test on ubuntu/macos/windows.

## Architecture & Data Flow

```
main.ts (Electron main process — thin orchestrator)
├── main-process/createMainWindow.ts: frameless BrowserWindow loading music.youtube.com
│   ├── navigation guards (setWindowOpenHandler + will-navigate) via tools/navigationPolicy.ts
│   │   — allowlisted hosts (music.youtube.com + Google auth); everything else → shell.openExternal
│   ├── did-fail-load (main frame, not ERR_ABORTED) → loads src/offline/offline.html fallback
│   ├── resizable; size restored from `windowSize` setting, persisted on debounced resize
│   └── blur → hide, unless `alwaysOnTop` is enabled
├── client/index.ts (preload, contextIsolation)
│   ├── IPC media-key events → controls.ts (DOM queries against YouTube Music's DOM,
│   │   e.g. #play-pause-button, player-bar previous/next buttons)
│   ├── exposes `appShell.retry` (contextBridge) used by the offline page
│   └── polls navigator.mediaSession.metadata (1s) → sends NOW_PLAYING to main
├── main-process/nowPlaying.ts: NOW_PLAYING → tray tooltip, macOS tray title,
│   optional track-change Notification (gated by `showNotifications` setting)
├── main-process/createTray.ts, positionWindow.ts, registerShortcuts.ts, registerIpc.ts
├── main-process/createSettingsWindow.ts: settings BrowserWindow
│   (contextIsolation:true + src/settings/preload.ts exposing `settingsAPI`)
├── tools/settings.ts: typed persistent settings via electron-store (key: youmusicflow-config)
├── ui/menuTemplate.ts: app menu bar
└── ui/contextTemplate.ts: tray right-click context menu
```

**Media key flow:** OS media key → `globalShortcut` in main → `webContents.send(IPCEventName)` → preload `ipcRenderer.on(...)` → DOM manipulation in `controls.ts`.

**Settings window** is opened via `app.emit('open-settings')` from the tray context menu. It communicates with main through IPC (`get-settings`, `update-setting`, `get-platform`, `get-app-version`). The offline page uses `retry-load`.

## Build Output

- TypeScript compiles from `src/` → `app/` (configured in `tsconfig.json`).
- Non-TS assets are copied verbatim by `copy-assets.js`: `src/settings/{index.html,style.css,renderer.js}` → `app/settings/` and `src/offline/offline.html` → `app/offline/`.
- `app/` is gitignored and regenerated on each build. Never manually edit files there.

## Code Style

- **No semicolons**, **single quotes** (enforced by Prettier — `.prettierrc`). `settings.ts` and `src/settings/renderer.js` retain semicolon style.
- TypeScript strict mode enabled, but `noImplicitAny` is `false`.
- Controls functions accept `document: any` — they operate on whatever DOM is injected (real or JSDOM).

## Testing

- Tests live in `spec/` (mirrors `src/` structure, including `spec/main-process/`), **not** co-located.
- Uses `ts-jest` with `node` environment. Some tests use `jsdom` directly (e.g. `controls.spec.ts` constructs DOM via `JSDOM`).
- `jest.esm-transformer.js` downlevels jsdom 28's ESM-only deps (see `transformIgnorePatterns` in `jest.config.js`).
- Main-process specs must `jest.mock('electron')` and `jest.mock('electron-store')` (class stub) before importing the module under test.
- `platformResolver` is tested by calling `setCustomType()` to override `os.type()` at runtime.
- Snapshot tests exist for `IPCEventNames` (includes `NOW_PLAYING`) and UI templates — snapshots in `spec/**/__snapshots__/`.

## Platform-Specific Behavior

- `platformResolver.ts` uses `os.type()` to detect OS. Tests override this with `setCustomType()`.
- **macOS:** App name forced to "YouMusicFlow" (overrides Electron default). Dock icon set explicitly. Tray icon adapts to dark/light mode via `nativeTheme.shouldUseDarkColors`. Window positioned relative to tray icon with pixel offsets. `windowPosition` setting is hidden on macOS (settings UI hides the dropdown). Now-playing title shown next to the tray icon.
- **Windows:** Window positioned relative to taskbar using `getTrayPosition()` logic. NSIS and AppX (Microsoft Store) targets configured; AppX can only be built on Windows.
- `offsetCalclator.ts` (note: typo in filename — "Calclator") provides per-OS pixel offsets for tray-to-window positioning.

## Key Gotchas

- **`offsetCalclator.ts`** has a typo in the filename (`Calclator` not `Calculator`). Don't "fix" this without updating all imports.
- The settings renderer (`src/settings/renderer.js`) is plain JS talking to `window.settingsAPI` (exposed by `src/settings/preload.ts`) — no direct `require('electron')`.
- `windowSize` is a **main-process-only** setting: persisted on window resize, deliberately rejected by the `update-setting` IPC validator (`isValidSetting`). Renderer input is untrusted — NOW_PLAYING payloads are validated in `nowPlaying.ts`.
- Positioning math uses live `mainWindow.getSize()` — don't reintroduce fixed-size constants into `positionWindow.ts` (they'd clobber user resizes).
- External links (share, help, etc.) open in the default browser via the navigation allowlist — don't loosen `navigationPolicy.ts` without keeping Google auth hosts (login breaks without them).
- macOS: `LSUIElement: 1` in build config means the app appears as a background/tray-only app (no Dock icon unless explicitly set).
- `youmusicflow-config.json` in the repo root is a sample/defaults config — the actual runtime config is managed by `electron-store` in the user's data directory.
