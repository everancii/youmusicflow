# YouMusicFlow — Reliability & Polish Milestone

## What This Is

Electron desktop app wrapping YouTube Music in a compact, frameless, tray-anchored mini-player (macOS/Windows/Linux). This milestone hardens the existing app: reliable media controls, robust window/network behavior, now-playing surfacing, code-quality cleanup, and project hygiene.

## Core Value

Media keys and tray interactions must always work — a tray music player that misses play/pause or next-track presses is worthless.

## Requirements

### Validated

<!-- Inferred from existing code (see .planning/codebase/) -->

- ✓ Frameless 375×667 tray-anchored window loading music.youtube.com — existing
- ✓ Global media keys (play/pause, prev, next) via globalShortcut + IPC + DOM clicks — existing
- ✓ Tray click shows window, blur hides, right-click context menu (Settings/Quit) — existing
- ✓ Settings window (windowPosition, startOnLogin, alwaysOnTop, hideDockIcon) persisted via electron-store — existing
- ✓ Platform-aware positioning (macOS tray offsets, Windows taskbar edge detection) — existing
- ✓ Dark/light tray icon at startup (macOS) — existing
- ✓ Scrollbar hiding CSS injection — existing

### Active

**Quick wins:**
- [ ] Single-instance lock — second launch focuses existing instance instead of duplicating tray/shortcuts
- [ ] Robust prev/next — use YT Music player bar `.previous-button`/`.next-button` instead of queue-DOM walking
- [ ] Media-key toggle — new setting to disable global media key capture (default: enabled)
- [ ] Tray icon reacts to macOS theme change at runtime (template image preferred, else nativeTheme.on('updated'))

**Robustness & UX:**
- [ ] External links open in default browser (`setWindowOpenHandler` + `will-navigate` guard to music.youtube.com origin)
- [ ] Offline/failed-load handling — `did-fail-load` shows retry UI instead of blank transparent window
- [ ] Now-playing integration — track title/artist from page (MediaSession or MutationObserver in preload) → tray tooltip, macOS tray title, desktop notification on track change (notification toggleable)
- [ ] Resizable window with size persisted in electron-store (sensible min size; positioning math uses live size)
- [ ] Blur-hide respects pin — window does not hide on blur when `alwaysOnTop` enabled

**Code quality:**
- [ ] `main.ts` split into modules: `createMainWindow()`, `createTray()`, `registerShortcuts()`, `registerIpc()`, positioning unified (kill hardcoded `375` in macOS tray-click path)
- [ ] `settings.ts` typed — remove all `@ts-ignore`, `updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K])`, IPC `update-setting` validates keys/values
- [ ] Settings window hardened — contextBridge preload, `nodeIntegration: false`, `contextIsolation: true`

**Distribution / hygiene:**
- [ ] `@types/semver` removed from dependencies (orphaned after auto-update removal)
- [ ] Single lockfile (npm) — remove `yarn.lock`
- [ ] CI consolidated to GitHub Actions (mac/win/linux matrix: build + test), CircleCI/AppVeyor removed
- [ ] AGENTS.md updated to match reality (no auto-update.ts, no webRequest ad-blocking, new module layout)

### Out of Scope

- AppX/Microsoft Store publisher values — no Partner Center identity available; existing `openspec/changes/microsoft-store-release-build/` stays parked
- Renaming `offsetCalclator.ts` typo — documented gotcha, rename risk outweighs benefit this milestone
- Ad/tracker blocking — never actually existed in code despite AGENTS.md claim; separate feature decision
- In-app auto-update — deliberately removed; Store/manual updates only
- electron-store v10+ upgrade — ESM-only, blocked by CommonJS build; revisit with build modernization
- New mini-player UI (`src/mini-player/` placeholder) — separate future milestone

## Context

- Brownfield: codebase mapped at `.planning/codebase/` (2026-07-26)
- Small codebase (~600 lines TS) with good test seams (`document: any` injection, `setCustomType`) but `main.ts` entirely untested
- Controls are DOM-coupled to YouTube Music — selectors are the fragile core; robust selectors + fallbacks matter more than elegance
- Prettier: no semicolons, single quotes; tests in `spec/` mirroring `src/`; conventional commits
- Build: `tsc` src→app + `copy-assets.js`; `app/` gitignored, never hand-edited

## Constraints

- **Tech stack**: Electron 40 + TypeScript CommonJS build — no ESM migration this milestone
- **Compatibility**: macOS, Windows, Linux all must keep working; platform-specific paths tested via `platformResolver.setCustomType()`
- **Testing**: new pure logic must land in `src/tools/` or `src/client/controls.ts` with specs in `spec/`; Electron-API-heavy code excluded from unit tests
- **Settings UI**: stays plain HTML/CSS/JS copied by `copy-assets.js` (but gains a compiled preload for contextBridge)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Media-key fix = settings toggle, not dynamic registration | Simplest; user controls behavior; avoids fragile focus-lifecycle logic | — Pending |
| CI = GitHub Actions single workflow | One config, native matrix, replaces CircleCI+AppVeyor | — Pending |
| Drop AppX work this milestone | No Partner Center identity available | — Pending |
| prev/next via player bar buttons (not queue DOM walk) | Works without queue rendered, no boundary failures | — Pending |
| Blur-hide tied to alwaysOnTop (no new setting) | Reuses existing mental model: pinned = stays visible | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-26 after initialization*
