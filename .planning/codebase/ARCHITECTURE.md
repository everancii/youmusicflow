# Architecture

**Analysis Date:** 2026-07-26

## Pattern Overview

**Overall:** Electron tray mini-player wrapping a remote web app (YouTube Music)

**Key Characteristics:**
- Two-process model: main process (orchestration) + renderer (music.youtube.com with preload)
- Frameless, fixed-size (375×667), tray-anchored window; hides on blur
- No local UI for playback — the web app IS the UI; app adds chrome, positioning, media keys, settings
- Separate settings BrowserWindow with plain HTML/JS (legacy nodeIntegration mode)

## Layers

**Main process (`src/main.ts`):**
- Purpose: app lifecycle, window/tray creation, positioning, global shortcuts, IPC handlers
- Contains: one large `app.on('ready')` handler (~280 lines) doing everything
- Depends on: `tools/*`, `ui/*`, `types/ipc`
- Used by: Electron runtime (entry point `app/main.js` after build)

**Preload/client layer (`src/client/`):**
- Purpose: bridge IPC media-key events to DOM actions inside YouTube Music
- Contains: `index.ts` (ipcRenderer listeners + scrollbar CSS injection), `controls.ts` (pure DOM-query functions)
- Depends on: YouTube Music's live DOM structure
- Used by: main window `webPreferences.preload` (contextIsolation: true, nodeIntegration: false)

**Tools layer (`src/tools/`):**
- Purpose: small pure-ish helpers
- Contains: `platformResolver.ts` (os.type() wrapper with test override), `getTrayPosition.ts` (pure geometry), `offsetCalclator.ts` (per-OS pixel offsets; filename typo intentional), `getNativeIconName.ts` (theme-aware tray icon), `settings.ts` (electron-store wrapper)
- Depends on: node `os`, electron `nativeTheme`, electron-store
- Used by: main process

**UI templates (`src/ui/`):**
- Purpose: menu structure as data
- Contains: `menuTemplate.ts` (app menu), `contextTemplate.ts` (tray right-click menu)
- Used by: main process via `Menu.buildFromTemplate`

**Settings window (`src/settings/`, NOT compiled):**
- Purpose: user preferences UI
- Contains: `index.html`, `style.css`, `renderer.js` (CommonJS require('electron'))
- Runs with `nodeIntegration: true, contextIsolation: false` — direct ipcRenderer use
- Copied verbatim to `app/settings/` by `copy-assets.js`

## Data Flow

**Media key press:**
1. OS media key → `globalShortcut` handler in `src/main.ts`
2. `mainWindow.webContents.send(IPCEventNames.PLAY_PAUSE | PREV | NEXT)`
3. Preload `ipcRenderer.on(...)` in `src/client/index.ts`
4. `Controls.playPause(document)` etc. query and click YouTube Music DOM elements

**Settings change:**
1. User toggles control in settings window → `ipcRenderer.send('update-setting', key, value)`
2. `ipcMain.on('update-setting')` in `src/main.ts` persists via `updateSetting()` (electron-store)
3. Main applies live side effect (setAlwaysOnTop / setLoginItemSettings / reposition / dock visibility)

**Window show:**
1. Tray click → macOS: position from tray bounds + hardcoded offsets; Windows: `updateWindowPosition()` (workArea + `getTrayPosition` + `windowPosition` setting)
2. `mainWindow.show()`; `blur` event hides it again

**State Management:**
- Settings: electron-store JSON in user-data dir (schema in `src/tools/settings.ts`)
- Playback state: entirely inside YouTube Music web app; app holds none

## Key Abstractions

**IPCEventNames (`src/types/ipc.ts`):**
- Purpose: typed channel names for media control events
- Pattern: string enum, snapshot-tested

**Controls functions (`src/client/controls.ts`):**
- Purpose: DOM operations decoupled from real document (accept `document: any`)
- Pattern: dependency injection of DOM — enables JSDOM testing

**PlatformResolver (`src/tools/platformResolver.ts`):**
- Purpose: OS detection with runtime override (`setCustomType`) for tests
- Pattern: module-level mutable state (test seam)

## Entry Points

**`src/main.ts` → `app/main.js`:**
- Triggers: Electron launch (`npm start`, packaged app)
- Responsibilities: everything (window, tray, shortcuts, IPC, settings window)

**`src/client/index.ts` → `app/client/index.js`:**
- Triggers: preload for main BrowserWindow
- Responsibilities: style injection, IPC event wiring

## Error Handling

**Strategy:** essentially none — happy-path code
- Controls return `false` when DOM element missing (silent no-op)
- No `did-fail-load` handling; blank window if network fails
- No try/catch around IPC handlers or store operations

## Cross-Cutting Concerns

**Logging:** electron-log declared but effectively unused; no structured logging
**Validation:** electron-store schema validates settings shape; `update-setting` IPC accepts arbitrary key/value with no whitelist
**Security:** main window properly isolated (contextIsolation + no nodeIntegration); settings window is not; no `setWindowOpenHandler` / navigation restrictions

---

*Architecture analysis: 2026-07-26*
*Update when major patterns change*
