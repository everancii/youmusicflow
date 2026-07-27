# Plan 03-02 Summary: Now-Playing Pipeline

**Status:** Complete
**Commit:** 2292440

## What shipped
- `types/ipc.ts` — `NOW_PLAYING = 'now-playing'` (snapshot updated; diff = only the new key)
- `src/client/index.ts` — 1s poll of `navigator.mediaSession.metadata`, sends `{title, artist}` on change (no DOM scraping)
- `src/main-process/nowPlaying.ts` — pure `formatTooltip`/`truncate`/`shouldNotify` + `registerNowPlaying({tray})`: tooltip, macOS `tray.setTitle` (truncated 30), silent Notification on track *change* only (never first track), gated by `showNotifications`; payload validated (untrusted renderer)
- `settings.ts` — `showNotifications: boolean` (default true) in AppSettings/schema/isValidSetting
- Settings UI — "Track change notifications" checkbox wired via settingsAPI
- `main.ts` — `registerNowPlaying({ tray })` after tray creation

## Verification
- Build clean; 9/9 suites, 57 tests (8 new nowPlaying, +1 settings key case)

## Deviations
None.
