# AGENTS.md — Minimal YouTube Music Player

Electron desktop app that wraps [YouTube Music](https://music.youtube.com) in a compact, frameless, tray-based mini-player. Cross-platform (macOS, Windows, Linux).

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Compiles TypeScript (`src/` → `app/`) then copies settings UI assets into `app/settings/` via `copy-assets.js` |
| `npm start` | Builds then launches Electron (`app/main.js`) |
| `npm run watch` | Watches and recompiles TypeScript on change |
| `npm test` | Runs Jest with `ts-jest` preset, verbose output |
| `npm run test:coverage` | Jest with coverage collection |
| `npm run format` | Prettier on `src/**/*.{js,ts}` (writes in-place) |
| `npm run dist` | Packages distributable with `electron-builder` → `release/` |
| `npm run pack` | Packages into a directory (no installer) |

## Architecture & Data Flow

```
main.ts (Electron main process)
├── loads https://music.youtube.com into a frameless BrowserWindow
├── client/index.ts (preload script via contextIsolation)
│   └── listens for IPC media-key events → calls controls.ts
│       └── controls.ts: DOM queries against YouTube Music's actual DOM
│           (e.g. #play-pause-button, ytmusic-player-queue-item[selected])
├── tools/auto-update.ts: self-updater via electron-updater (side-effect import)
├── tools/settings.ts: persistent settings via electron-store (key: minimalytm-config)
├── ui/menuTemplate.ts: app menu bar
├── ui/contextTemplate.ts: tray right-click context menu
└── Settings window: separate BrowserWindow loading src/settings/ (plain HTML/CSS/JS,
    NOT TypeScript — uses nodeIntegration:true, contextIsolation:false)
```

**Media key flow:** OS media key → `globalShortcut` in main → `webContents.send(IPCEventName)` → preload `ipcRenderer.on(...)` → DOM manipulation in `controls.ts`.

**Settings window** is opened via `app.emit('open-settings')` from the tray context menu. It communicates with main through IPC handles (`get-settings`, `update-setting`, `get-platform`, `get-app-version`).

## Build Output

- TypeScript compiles from `src/` → `app/` (configured in `tsconfig.json`).
- The settings UI (`src/settings/*.html,css,js`) is **not** compiled — it's copied verbatim to `app/settings/` by `copy-assets.js` during build.
- The `mini-player/` directory under `src/` is currently empty.
- `app/` is gitignored and regenerated on each build.

## Code Style

- **No semicolons**, **single quotes** (enforced by Prettier — `.prettierrc`).
- TypeScript strict mode enabled, but `noImplicitAny` is `false`.
- Several `@ts-ignore` comments exist in `settings.ts` due to `electron-store` schema typing friction.
- Controls functions accept `document: any` — they operate on whatever DOM is injected (real or JSDOM).

## Testing

- Tests live in `spec/` (mirrors `src/` structure), **not** co-located.
- Uses `ts-jest` with `node` environment. Some tests use `jsdom` directly (e.g. `controls.spec.ts` constructs DOM via `JSDOM`).
- `platformResolver` is tested by calling `setCustomType()` to override `os.type()` at runtime.
- Snapshot tests exist for `IPCEventNames` and UI templates — snapshots are in `spec/**/__snapshots__/`.

## Platform-Specific Behavior

- `platformResolver.ts` uses `os.type()` to detect OS. Tests override this with `setCustomType()`.
- **macOS:** App name forced to "Minimal YouTube Music Player" (overrides Electron default). Dock icon set explicitly. Tray icon adapts to dark/light mode via `nativeTheme.shouldUseDarkColors`. Window positioned relative to tray icon with pixel offsets. `windowPosition` setting is hidden on macOS (settings UI hides the dropdown).
- **Windows:** Window positioned relative to taskbar using `getTrayPosition()` logic. Supports NSIS and AppX (Microsoft Store) targets. AppX can only be built on Windows.
- `offsetCalclator.ts` (note: typo in filename — "Calclator") provides per-OS pixel offsets for tray-to-window positioning.

## Key Gotchas

- **`offsetCalclator.ts`** has a typo in the filename (`Calclator` not `Calculator`). Don't "fix" this without updating all imports in `main.ts`.
- The settings renderer (`src/settings/renderer.js`) uses CommonJS `require('electron')`, not ES imports — it's plain JS, not TypeScript.
- Ad/tracker blocking is done via `webRequest.onBeforeRequest` filtering doubleclick.net, google-analytics.com, etc. — not a content blocker.
- macOS: `LSUIElement: 1` in build config means the app appears as a background/tray-only app (no Dock icon unless explicitly set).
- `auto-update.ts` is imported purely for side effects — it registers its own `app.on('ready')` listener.
- The `app/` directory is the build output and is gitignored. Never manually edit files there.
- `minimalytm-config.json` in the repo root is a sample/defaults config — the actual runtime config is managed by `electron-store` in the user's data directory.
- Binary publishing is configured for S3 (`minimalytm-binaries` bucket, `ap-northeast-1`).
