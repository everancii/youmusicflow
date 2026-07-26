# Codebase Concerns

**Analysis Date:** 2026-07-26

## Tech Debt

**Monolithic `app.on('ready')` in `src/main.ts`:**
- Issue: ~280 lines — window creation, tray, positioning, shortcuts, settings window, all IPC handlers in one closure
- Why: grew organically from small wrapper
- Impact: untestable, hard to modify safely; positioning logic duplicated (macOS tray-click handler hardcodes `375` instead of `WINDOW_WIDTH` and bypasses `updateWindowPosition()`)
- Fix approach: extract `createMainWindow()`, `createTray()`, `registerShortcuts()`, `registerIpc()`, `positionWindow()` modules

**`@ts-ignore` cluster in `src/tools/settings.ts`:**
- Issue: five `@ts-ignore` around electron-store get/set; `updateSetting(key, value: any)` untyped
- Why: electron-store 8.x generic typing friction
- Impact: no compile-time safety on settings; IPC `update-setting` accepts arbitrary keys/values from renderer
- Fix approach: `<K extends keyof AppSettings>(key: K, value: AppSettings[K])` typed wrapper; whitelist keys in the IPC handler

**Filename typo `src/tools/offsetCalclator.ts`:**
- Issue: "Calclator" not "Calculator"; test file named `calcPosition.spec.ts` (third name)
- Impact: confusion; renaming requires updating `src/main.ts` import (documented gotcha in AGENTS.md)
- Fix approach: coordinated rename or leave documented

**Stale docs vs code (AGENTS.md drift):**
- Issue: AGENTS.md claims ad/tracker blocking via `webRequest.onBeforeRequest` and `tools/auto-update.ts` side-effect import — neither exists in current `src/`
- Impact: agents/contributors plan against phantom features
- Fix approach: update AGENTS.md after each behavior removal

**Dual lockfiles + dual CI:**
- Issue: `package-lock.json` AND `yarn.lock`; `.circleci/config.yml` AND `appveyor.yml`
- Impact: dependency/CI drift
- Fix approach: pick npm + one CI, delete the others

## Known Bugs

**No single-instance lock:**
- Symptoms: launching twice yields two tray icons, two windows fighting for global media keys
- Trigger: open app while already running
- Fix: `app.requestSingleInstanceLock()` at startup

**prev/next silently fail without visible queue:**
- Symptoms: media keys do nothing on prev/next
- Trigger: queue panel not rendered, or selected item is first/last (`previousElementSibling`/`nextElementSibling` null) — `src/client/controls.ts`
- Workaround: none for user
- Root cause: DOM-walk strategy instead of YT Music's own prev/next buttons

**Tray icon ignores runtime theme change (macOS):**
- Symptoms: light icon on dark menubar (or inverse) after theme switch
- Trigger: change macOS appearance while app runs; `getNativeIconName()` evaluated once at startup
- Fix: `nativeTheme.on('updated')` → `tray.setImage()`, or template image

## Security Considerations

**Settings window runs `nodeIntegration: true, contextIsolation: false`:**
- Risk: full Node access in a renderer; low exposure (local file only) but legacy pattern
- Current mitigation: loads only local `app/settings/index.html`
- Recommendation: contextBridge preload + sandbox

**No navigation/window-open restrictions on main window:**
- Risk: links inside YouTube Music (share targets, ads, account pages) can navigate the mini-player anywhere, with the preload still attached
- Current mitigation: none (`setWindowOpenHandler`/`will-navigate` absent in `src/main.ts`)
- Recommendation: block non-`music.youtube.com` navigation; route external links to `shell.openExternal`

**Unvalidated `update-setting` IPC:**
- Risk: any renderer code can write arbitrary keys into electron-store
- Current mitigation: electron-store schema rejects unknown enum values but handler applies side effects before validation feedback
- Recommendation: whitelist keys + validate types in `ipcMain.on('update-setting')`

## Performance Bottlenecks

- None measured. `injectCSS` bound to 4 lifecycle events (`did-finish-load`, `did-navigate`, `did-navigate-in-page`, `dom-ready`) — redundant repeated insertCSS calls per navigation; harmless but wasteful.

## Fragile Areas

**`src/client/controls.ts` (YouTube Music DOM coupling):**
- Why fragile: selectors (`#play-pause-button`, `ytmusic-player-queue-item[selected]`) break on upstream redesign
- Safe modification: keep functions pure, update selectors + JSDOM fixtures together
- Test coverage: good for current selectors

**Window positioning (`src/main.ts` + `getTrayPosition` + `offsetCalclator`):**
- Why fragile: pixel offsets hardcoded per OS; multi-display and taskbar edge cases; macOS path duplicated in tray-click handler
- Safe modification: change `updateWindowPosition()` only, keep macOS click handler in sync (or unify first)
- Test coverage: `getTrayPosition` untested; `getOffset` tested

**AppX packaging config:**
- Why fragile: placeholder `publisher`/`publisherDisplayName` values; appx build only works on Windows
- Safe modification: values must match Partner Center identity exactly (see `openspec/changes/microsoft-store-release-build/`)

## Dependencies at Risk

**electron-store 8.x:**
- Risk: v8 is old (v10+ is ESM-only); upgrade path blocked by CommonJS build
- Impact: stuck on old version or requires ESM migration
- Migration plan: stay on 8.x until build modernization

**`@types/semver` in `dependencies`:**
- Risk: orphaned after auto-update removal; ships types as runtime dep
- Migration plan: remove or move to devDependencies

## Missing Critical Features

**Offline/failed-load handling:**
- Problem: `loadURL` failure leaves blank transparent window; no `did-fail-load` handler
- Blocks: usable behavior without network

**Now-playing metadata:**
- Problem: no track info surfaced to tray/notifications; tooltip static "YouMusicFlow"
- Complexity: medium (MutationObserver or MediaSession in preload + IPC)

## Test Coverage Gaps

- `src/main.ts` entirely untested (High priority — extract logic first)
- `src/tools/getTrayPosition.ts` untested pure function (Low difficulty, High value for Windows positioning)
- `src/tools/settings.ts` untested (Medium — needs electron-store mock)

---

*Concerns audit: 2026-07-26*
*Update as issues are fixed or new ones discovered*
