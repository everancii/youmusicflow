# Phase 3 Research: Robust Shell & Now Playing

## Key findings

### NAV-01 — navigation guard
- Two hooks needed: `webContents.setWindowOpenHandler` (new-window/`target=_blank` — return `{ action: 'deny' }` + `shell.openExternal`) and `will-navigate` (same-window navigations — `preventDefault` + `shell.openExternal`).
- **Login must keep working**: Google auth navigates in-window through `accounts.google.com` / `consent.youtube.com` / `www.youtube.com` redirects. Allowlist (in-window): `music.youtube.com`, `accounts.google.com`, `accounts.youtube.com`, `consent.youtube.com`, `consent.google.com`, `www.youtube.com`, `myaccount.google.com`. Everything else → external browser.
- Policy = pure function `isAllowedNavigation(url: string): boolean` in `src/tools/navigationPolicy.ts` (URL parse + hostname allowlist; non-http(s) schemes → false). Unit-testable in node env.

### NAV-02 — offline retry screen
- `did-fail-load` on mainWindow → load `app/offline/offline.html`. **Must ignore `errorCode === -3` (ERR_ABORTED)** — fires on normal in-page redirects/cancels.
- Retry channel: the main-window preload (`client/index.js`) persists across navigations, so expose `contextBridge.exposeInMainWorld('appShell', { retry: () => ipcRenderer.send('retry-load') })`. Offline page: retry button → `window.appShell.retry()`, plus `window.addEventListener('online', ...)` auto-retry (renderer `navigator.onLine` works offline-detection here; no main-process polling needed).
- `retry-load` handler in registerIpc → `mainWindow.loadURL('https://music.youtube.com')`.
- Build plumbing: `copy-assets.js` has a hardcoded whitelist for `src/settings/` only — extend it to also copy `src/offline/offline.html` (+ inline CSS in the html, no separate css file).

### NOW-01/NOW-02 — now-playing pipeline
- Don't scrape DOM selectors: YTM populates `navigator.mediaSession.metadata` (title/artist) reliably. Preload polls every 1s; on change → `ipcRenderer.send(IPCEventNames.NOW_PLAYING, { title, artist })`.
- `types/ipc.ts` has a snapshot test — adding `NOW_PLAYING` requires updating `spec/types/__snapshots__/ipc.spec.ts.snap` (run `jest -u`, verify diff is only the new key).
- Main: `tray.setToolTip(\`${title} — ${artist}\`)`; macOS additionally `tray.setTitle(title)` (truncate ~30 chars). Notification: `new Notification({ title, body: artist, silent: true }).show()` — only when a *previous* track existed (no notification on app launch) and setting enabled.
- New setting `showNotifications: boolean, default: true` — schema + `AppSettings` + `isValidSetting` boolean case + settings UI checkbox + spec update.

### WIN-01 — resizable + persisted size
- `resizable: true`, `setMinimumSize(300, 400)`. Persist via new `windowSize: { width, height }` setting (schema type object, default 375×667). Saved by **main** on debounced (500ms) `resize` event via `updateSetting('windowSize', ...)` — NOT renderer-settable, so `isValidSetting` keeps rejecting it from IPC (validator whitelist unchanged for it; add explicit test).
- Positioning math must use live size: `positionWindow.ts` formulas switch from `WINDOW_WIDTH/HEIGHT` constants to `mainWindow.getBounds().width/height`; constants remain as creation defaults (rename usage stays).
- `transparent: true` windows + resize: supported on macOS/Windows; keep `frame: false`.

### WIN-02 — pin overrides blur-hide
- Blur handler in `createMainWindow.ts` becomes `if (!getSetting('alwaysOnTop')) mainWindow.hide()` — reads setting live, so runtime IPC changes are honored without extra wiring.

## Risks
- Snapshot churn (ipc + possibly settings html) — update intentionally, verify diffs.
- `did-fail-load` also fires for subframes — guard `isMainFrame`.
- Both 03-02 and 03-03 touch `settings.ts`/main-process files — execute sequentially (inline execution does anyway).

## Plan split
- **03-01** (wave 1): navigationPolicy + setWindowOpenHandler/will-navigate + offline retry page + copy-assets extension + `appShell.retry` bridge + retry-load IPC. [NAV-01, NAV-02]
- **03-02** (wave 1): mediaSession poll in client preload → NOW_PLAYING IPC → tray tooltip/title + notifications + `showNotifications` setting/UI. [NOW-01, NOW-02]
- **03-03** (wave 2): resizable window, persisted `windowSize`, live-size positioning, blur respects pin. [WIN-01, WIN-02]
