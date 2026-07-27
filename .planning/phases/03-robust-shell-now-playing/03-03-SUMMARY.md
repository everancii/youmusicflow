# Plan 03-03 Summary: Resizable Window + Pin-Aware Blur

**Status:** Complete
**Commit:** 8a1563a

## What shipped
- `settings.ts` — `windowSize: {width, height}` (object schema, default 375×667); main-process-only — `isValidSetting` rejects it from renderer IPC (explicit test added)
- `createMainWindow.ts` — `resizable: true`, size restored from `windowSize` (malformed → defaults), `setMinimumSize(300, 400)`, debounced 500ms `resize` → `updateSetting('windowSize')`, blur handler skips hide when `alwaysOnTop`
- `positionWindow.ts` — constants renamed `DEFAULT_WINDOW_WIDTH/HEIGHT`; all positioning formulas use live `mainWindow.getSize()`; dropped the Windows-branch `setSize(375, 667)` that would have clobbered the user's chosen size on every reposition

## Verification
- Build clean; 9/9 suites, 58 tests
- Greps: `resizable: true`, `setMinimumSize`, live blur `getSetting('alwaysOnTop')`; hardcoded 375 only as the default constant

## Deviations
- Removed `mainWindow.setSize(...)` inside `updateWindowPosition` (not in plan text explicitly, but required — it re-forced 375×667 on every Windows reposition, defeating WIN-01)
