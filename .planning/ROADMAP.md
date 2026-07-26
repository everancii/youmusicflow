# Roadmap: YouMusicFlow — Reliability & Polish

## Overview

Harden an existing, working tray mini-player: first make controls and instancing bulletproof (quick wins), then restructure main-process code so the remaining features land in clean modules, then ship robustness/now-playing UX, and close with repo hygiene and a single CI pipeline.

## Phases

- [x] **Phase 1: Reliable Core** - Single instance, robust prev/next, media-key toggle, live tray theming (completed 2026-07-27)
- [ ] **Phase 2: Modular Main & Typed Settings** - Decompose main.ts, type settings end-to-end, harden settings window
- [ ] **Phase 3: Robust Shell & Now Playing** - External links, offline retry, now-playing surfacing, resizable/pinnable window
- [ ] **Phase 4: Hygiene & CI** - Dependency/lockfile cleanup, GitHub Actions, accurate AGENTS.md

## Phase Details

### Phase 1: Reliable Core
**Goal**: Media controls and app instancing work every time, without hijacking other apps
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: [INST-01, CTRL-01, CTRL-02, TRAY-01]
**Success Criteria** (what must be TRUE):
  1. Launching the app twice focuses the existing window — one tray icon, one shortcut registration
  2. Prev/next skip tracks with the queue panel closed and at queue boundaries
  3. Toggling the new media-keys setting off releases media keys to other apps without restart
  4. Switching macOS light/dark mode updates the tray icon immediately
**Plans**: 2 plans

Plans:
- [x] 01-01: Single-instance lock + media-key setting toggle (register/unregister live)
- [x] 01-02: Player-bar prev/next controls + runtime tray theme reaction

### Phase 2: Modular Main & Typed Settings
**Goal**: main.ts split into testable modules; settings typed and sandboxed
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: [CODE-01, CODE-02, CODE-03]
**Success Criteria** (what must be TRUE):
  1. app.on('ready') orchestrates named modules (createMainWindow/createTray/registerShortcuts/registerIpc); behavior unchanged
  2. Positioning logic exists once — macOS tray-click path reuses it (no hardcoded 375)
  3. settings.ts compiles with zero @ts-ignore; update-setting IPC rejects unknown keys/invalid values
  4. Settings window runs with contextIsolation:true via contextBridge preload and still reads/writes all settings
**Plans**: 2 plans

Plans:
- [ ] 02-01: Extract main-process modules + unify positioning
- [ ] 02-02: Typed settings store + validated IPC + settings-window preload hardening

### Phase 3: Robust Shell & Now Playing
**Goal**: Window behaves like a polished mini-player: safe navigation, offline recovery, track info, size/pin control
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: [NAV-01, NAV-02, NOW-01, NOW-02, WIN-01, WIN-02]
**Success Criteria** (what must be TRUE):
  1. Clicking external/share links opens the default browser; window never leaves music.youtube.com
  2. Launching offline shows a retry screen; retry loads the player once network returns
  3. Tray tooltip (and macOS tray title) shows current track/artist, updating on track change
  4. Track-change desktop notifications fire and can be disabled in settings
  5. Window can be resized, size survives restart, and blur no longer hides a pinned (alwaysOnTop) window
**Plans**: 3 plans

Plans:
- [ ] 03-01: Navigation guard (setWindowOpenHandler + will-navigate) + did-fail-load retry screen
- [ ] 03-02: Now-playing pipeline (preload observer → IPC → tray tooltip/title + notifications + setting)
- [ ] 03-03: Resizable window with persisted size + blur-hide respects alwaysOnTop

### Phase 4: Hygiene & CI
**Goal**: One lockfile, one CI, honest docs, no dead dependencies
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: [HYG-01, HYG-02, HYG-03, HYG-04]
**Success Criteria** (what must be TRUE):
  1. GitHub Actions runs build + tests on mac/win/linux; CircleCI and AppVeyor configs removed
  2. yarn.lock and @types/semver gone; npm install + npm test green
  3. AGENTS.md describes actual code (module layout, no auto-update/ad-block claims)
**Plans**: 1 plan

Plans:
- [ ] 04-01: Dependency/lockfile cleanup + GitHub Actions workflow + AGENTS.md refresh

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Reliable Core | 0/2 | Not started | - |
| 2. Modular Main & Typed Settings | 0/2 | Not started | - |
| 3. Robust Shell & Now Playing | 0/3 | Not started | - |
| 4. Hygiene & CI | 0/1 | Not started | - |
