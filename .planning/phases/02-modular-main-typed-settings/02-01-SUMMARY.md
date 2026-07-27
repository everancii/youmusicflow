---
phase: 02-modular-main-typed-settings
plan: 01
status: complete
requirements: [CODE-01]
commits:
  - d0e320c refactor: decompose main.ts into main-process modules, unify window sizing
---

# Summary: Plan 02-01 — Extract Main-Process Modules + Unify Positioning

## What was built

- **CODE-01**: `main.ts` 370 → 102 lines. Six new modules in `src/main-process/`:
  - `positionWindow.ts` — `WINDOW_WIDTH`/`WINDOW_HEIGHT` constants, `updateWindowPosition()` (Windows + generic branches verbatim), `positionOnTrayClickMac()` using `WINDOW_WIDTH` (hardcoded `375` at old main.ts:252 eliminated)
  - `createMainWindow.ts` — BrowserWindow factory, CSS injection ×4 listeners, blur-hide, login items, `updateDockVisibility`
  - `createTray.ts` — Tray factory + nativeTheme listener + click wiring via callbacks
  - `registerShortcuts.ts` — `registerMediaKeys(mainWindow)` / `unregisterMediaKeys()`
  - `registerIpc.ts` — all 4 IPC handlers + update-setting side-effect switch (deps injected)
  - `createSettingsWindow.ts` — open-settings handler (webPreferences unchanged; hardened in 02-02)
- `main.ts` ready handler is now a 10-step orchestration; single-instance lock, darwin blocks, window-all-closed unchanged.
- Asset paths adjusted for new compile location (`app/main-process/` → `../../assets`, `../client/index.js`, `../settings/index.html`).

## Deviations

None.

## Verification

- `npm run build` ✓ — `app/main-process/` contains 6 compiled modules
- Literal `375` appears only as `WINDOW_WIDTH = 375` in positionWindow.js; zero in main.js ✓
- `npm test` ✓ — 6/6 suites, 18 tests (no test changes this plan)
