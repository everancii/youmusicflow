---
phase: 01-reliable-core
plan: 02
status: complete
requirements: [CTRL-01, TRAY-01]
commits:
  - 9677d76 feat: use player-bar buttons for prev/next with queue-walk fallback
  - 5692243 feat: update macOS tray icon on system theme change
---

# Summary: Plan 01-02 — Robust Prev/Next & Live Tray Theme

## What was built

- **CTRL-01**: `prevTrack`/`nextTrack` rewritten with ordered fallback via shared `clickPlayerBarButton()`:
  1. `ytmusic-player-bar .previous-button` / `.next-button` (scoped)
  2. unscoped `.previous-button` / `.next-button`
  3. original queue-walk (`ytmusic-player-queue-item[selected]` sibling) as last resort
  Signatures and `document: any` convention preserved; `playPause` untouched.
- **Tests**: 6 new cases in `controls.spec.ts` — player-bar primary path (prev+next, queue untouched), queue-walk fallback (prev+next), empty-DOM false. Also fixed a pre-existing bug where a prevTrack case used `describe` instead of `test` (assertion ran outside any test).
- **TRAY-01**: `nativeTheme.on('updated')` listener after tray creation — macOS-guarded (`PlatformResolver.isMacOS()`), re-sets tray image via same `path.join(__dirname, '../assets', getNativeIconName())` expression as initial creation.

## Deviations

None.

## Verification

- `npm run build` ✓
- `npm test` ✓ — 6/6 suites, 18 tests
- grep: `nativeTheme.on('updated'` present in app/main.js ✓
