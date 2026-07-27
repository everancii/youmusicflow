# Plan 03-01 Summary: Navigation Guard + Offline Retry

**Status:** Complete
**Commit:** 0850c73

## What shipped
- `src/tools/navigationPolicy.ts` — `isAllowedNavigation()` hostname allowlist (YTM + Google auth hosts); http/https only; malformed URLs rejected
- `createMainWindow.ts` — `setWindowOpenHandler` (deny + openExternal for non-allowed), `will-navigate` guard, `did-fail-load` → offline page (isMainFrame, ignores ERR_ABORTED -3)
- `src/offline/offline.html` — dark retry screen; button + auto-retry on `online` event via `window.appShell.retry()`
- `src/client/index.ts` — contextBridge `appShell.retry` → `retry-load` IPC
- `registerIpc.ts` — `retry-load` handler reloads YTM
- `copy-assets.js` — generalized to asset groups; copies offline.html to `app/offline/`

## Verification
- Build clean, `app/offline/offline.html` present
- 8/8 suites, 48 tests (18 new navigationPolicy cases incl. `music.youtube.com.evil.com` phish rejection)

## Deviations
None.
