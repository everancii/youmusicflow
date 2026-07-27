# Phase 2 Research: Modular Main & Typed Settings

## Key findings

### 1. main.ts decomposition (CODE-01)
`src/main.ts` is 370 lines, one giant `ready` handler. Extraction seams (all closures over `mainWindow`/`tray`/`getSetting` — pass dependencies as params):

| Module | Pulls out | Notes |
|---|---|---|
| `src/main-process/createMainWindow.ts` | BrowserWindow ctor, CSS injection (4 events), blur-hide, login-item + dock visibility helpers | returns `{ mainWindow, updateDockVisibility }` |
| `src/main-process/positionWindow.ts` | `WINDOW_WIDTH/HEIGHT` consts, `updateWindowPosition()` (Windows + generic branch), macOS tray-click formula | kills the hardcoded `375` at main.ts:252 — both paths use `WINDOW_WIDTH` |
| `src/main-process/createTray.ts` | Tray ctor, tooltip, `nativeTheme.on('updated')`, click/right-click wiring | takes positioning callbacks |
| `src/main-process/registerShortcuts.ts` | `registerMediaKeys`/`unregisterMediaKeys` | takes `mainWindow` |
| `src/main-process/registerIpc.ts` | all `ipcMain` handlers incl. `update-setting` side-effects | takes deps object |

`main.ts` keeps: darwin app-name block, single-instance lock, `ready` orchestration, `window-all-closed`, settings-window creation (moves to `registerIpc`'s scope or its own `createSettingsWindow.ts` — decision: own module, opened via existing `app.emit('open-settings')` path so context-menu behavior is unchanged).

### 2. Typed settings (CODE-02)
- `electron-store@8.1.0` (CJS) exports `Schema<T>`. Root cause of the `@ts-ignore`s: schema declared as bare object then cast `as any`, which erases the generic. Fix: `const schema: Schema<AppSettings> = {...}` → `store.get('key')` and `store.set(key, value)` are fully typed. **Zero `@ts-ignore` achievable with no runtime change.**
- `updateSetting` becomes generic: `<K extends keyof AppSettings>(key: K, value: AppSettings[K])`.
- IPC validation: renderer input is untrusted (`key`/`value` are `any`). Add pure validator `isValidSetting(key, value)` — whitelist of `keyof AppSettings` with per-key type/enum checks — called in the `update-setting` handler; unknown keys/invalid values rejected (log + return). Pure function → unit-testable in `spec/`.
- `app.on('open-settings')` `@ts-ignore` in main.ts is out of CODE-02 scope (requirement targets settings.ts) — but cast to `any` event-name kills it cheaply; do it while touching the code.

### 3. Settings window hardening (CODE-03)
- New `src/settings/preload.ts` (TypeScript → compiled by tsc to `app/settings/preload.js`). Build check: `copy-assets.js` copies only files that exist in `src/settings/` (html/css/renderer.js), so the compiled `preload.js` is not clobbered. Verify after build.
- `contextBridge.exposeInMainWorld('settingsAPI', { getSettings, getAppVersion, getPlatform (invoke), updateSetting (send) })`.
- `renderer.js`: drop `require('electron')`, use `window.settingsAPI`. `window.close()` is a DOM API — still works with `nodeIntegration:false`.
- BrowserWindow webPreferences → `contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, './settings/preload.js')`.

## Risks
- Behavior must be byte-identical for positioning — extract mechanically, don't "improve" formulas.
- `mainWindow` is used inside extracted closures; pass explicitly, no module-level mutable singletons beyond main.ts's own.
- Jest: new pure modules (`positionWindow` consts, `isValidSetting`) testable in node env; window/tray factories not unit-tested (need electron runtime).

## Plan split
- **02-01** (wave 1): extract 5 main-process modules + settings window module; unify positioning; behavior unchanged. [CODE-01]
- **02-02** (wave 2, depends 02-01): typed schema/store, generic updateSetting, `isValidSetting` + validation in registerIpc, preload + contextBridge + renderer migration + hardened webPreferences. [CODE-02, CODE-03]
