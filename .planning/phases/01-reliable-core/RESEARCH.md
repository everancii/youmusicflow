# Phase 1 Research: Reliable Core

**Researched:** 2026-07-26 (inline — gsd-phase-researcher not installed)
**Phase goal:** Media controls and app instancing work every time, without hijacking other apps

## Key findings

### Single-instance lock (INST-01)
- `app.requestSingleInstanceLock()` must be called at module top level, BEFORE `app.on('ready')`. Returns `false` in the second instance → `app.quit()` immediately.
- First instance receives `app.on('second-instance', ...)` → show + focus `mainWindow`.
- Gotcha: `mainWindow` may be undefined if second-instance fires before ready completes — guard with `if (mainWindow)`.

### Media-key toggle (CTRL-02)
- `globalShortcut.register('MediaPlayPause'|'MediaPreviousTrack'|'MediaNextTrack', cb)` — current code registers unconditionally at ready.
- Live release: `globalShortcut.unregister(accelerator)` per key (safer than `unregisterAll()`, which would nuke future non-media shortcuts).
- Setting: `enableMediaKeys: boolean`, default `true` in electron-store schema. electron-store back-fills schema defaults for existing configs — no migration needed.
- Settings UI is plain HTML/JS (`src/settings/index.html` + `renderer.js`), copied verbatim by `copy-assets.js`. Add checkbox `id="enable-media-keys"` following exact pattern of `always-on-top`.
- `update-setting` IPC handler in main applies live: `enableMediaKeys === true` → register all three; `false` → unregister all three.

### Robust prev/next (CTRL-01)
- YT Music player bar (always rendered once player active): `ytmusic-player-bar` hosts `tp-yt-paper-icon-button.previous-button` and `tp-yt-paper-icon-button.next-button`.
- Selector strategy (ordered fallback):
  1. `document.querySelector('ytmusic-player-bar .previous-button')` (scoped, primary)
  2. `document.querySelector('.previous-button')` (unscoped fallback — class is unique on page)
  3. Existing queue-walk logic (last resort, keeps current behavior if YT renames bar classes)
- Same shape for next. Return `true` on click, `false` if nothing found — matches existing controls contract.
- Tests: existing `spec/client/controls.spec.ts` uses JSDOM-constructed DOM; add fixtures with player-bar markup + boundary cases (no prev sibling → player-bar button still clicked).

### Tray theme reaction (TRAY-01)
- Two options:
  - **Template image** (`setTemplateImage(true)` or `*Template.png` naming): macOS auto-adapts. Requires monochrome black+alpha asset — existing `icon_light.png`/`icon_dark.png` are not verified monochrome. Asset risk.
  - **`nativeTheme.on('updated')` listener** → `tray.setImage(path.join(assets, getNativeIconName()))`. Zero asset changes, reuses existing `getNativeIconName()` logic.
- **Decision: listener approach** — no asset work, testable via existing pattern. Template image noted as future polish.
- Listener must be registered after tray creation; no-op on non-macOS (getNativeIconName returns 'icon_dark.png' for non-mac anyway, but guard with `isMacOS()` to avoid pointless setImage calls).

## Plan-shaping implications

- Both plans touch `src/main.ts` → sequential waves (01-01 wave 1, 01-02 wave 2).
- `controls.ts` changes are pure DOM logic — fully unit-testable, no Electron imports.
- Phase 2 will relocate main.ts logic into modules; keep Phase 1 main.ts edits minimal and surgical to reduce Phase 2 rebase friction.
