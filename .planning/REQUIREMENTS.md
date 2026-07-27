# Requirements — YouMusicFlow Reliability & Polish

**Defined:** 2026-07-26
**Core value:** Media keys and tray interactions must always work.

## v1 Requirements

### Instance & Controls

- [x] **INST-01**: Launching the app a second time focuses the existing instance — no duplicate tray icons or shortcut registrations
- [x] **CTRL-01**: User can skip prev/next reliably via player-bar buttons (`.previous-button`/`.next-button`), including when the queue panel is not rendered and at queue boundaries
- [x] **CTRL-02**: User can disable global media-key capture via a settings toggle (default: enabled); disabled state unregisters shortcuts so other apps receive media keys

### Tray

- [x] **TRAY-01**: macOS tray icon updates immediately when system theme changes at runtime (template image or `nativeTheme.on('updated')`)
- [x] **NOW-01**: User can see current track title/artist as tray tooltip (and tray title on macOS), updating on track change
- [x] **NOW-02**: User gets a desktop notification on track change, toggleable in settings

### Window & Navigation

- [x] **NAV-01**: External links clicked inside YouTube Music open in default browser; window navigation restricted to music.youtube.com origins
- [x] **NAV-02**: Failed page load (offline) shows a retry screen instead of a blank transparent window
- [x] **WIN-01**: User can resize the window; chosen size persists across restarts and positioning math uses live size
- [x] **WIN-02**: Window does not hide on blur while `alwaysOnTop` (pin) is enabled

### Code Quality

- [x] **CODE-01**: `main.ts` decomposed into modules (`createMainWindow`, `createTray`, `registerShortcuts`, `registerIpc`); positioning logic unified — no hardcoded `375` duplicate
- [x] **CODE-02**: `settings.ts` fully typed — zero `@ts-ignore`; `updateSetting` key/value typed; `update-setting` IPC input validated
- [x] **CODE-03**: Settings window runs with `contextIsolation: true`, `nodeIntegration: false`, via a contextBridge preload

### Hygiene & Distribution

- [x] **HYG-01**: `@types/semver` removed (orphaned dependency)
- [x] **HYG-02**: Single lockfile — `yarn.lock` removed, npm canonical
- [x] **HYG-03**: GitHub Actions CI (mac/win/linux matrix: build + test) replaces CircleCI and AppVeyor
- [x] **HYG-04**: AGENTS.md matches reality (no auto-update.ts, no ad-blocking claim, new module layout documented)

## v2 Requirements

- **MINI-01**: Dedicated mini-player UI (`src/mini-player/`) — deferred, separate milestone
- **STORE-01**: Microsoft Store AppX publish with real Partner Center identity — blocked on account

## Out of Scope

| Item | Reason |
|------|--------|
| AppX publisher values | No Partner Center identity available |
| `offsetCalclator.ts` rename | Rename risk outweighs benefit; documented gotcha |
| Ad/tracker blocking | Never existed in code; separate feature decision |
| In-app auto-update | Deliberately removed; manual/Store updates only |
| electron-store v10+ / ESM migration | ESM-only, blocked by CommonJS build |

## Traceability

<!-- Filled by roadmap creation -->

| REQ-ID | Phase |
|--------|-------|
| INST-01 | 1 |
| CTRL-01 | 1 |
| CTRL-02 | 1 |
| TRAY-01 | 1 |
| NOW-01 | 3 |
| NOW-02 | 3 |
| NAV-01 | 3 |
| NAV-02 | 3 |
| WIN-01 | 3 |
| WIN-02 | 3 |
| CODE-01 | 2 |
| CODE-02 | 2 |
| CODE-03 | 2 |
| HYG-01 | 4 |
| HYG-02 | 4 |
| HYG-03 | 4 |
| HYG-04 | 4 |

---
*17 v1 requirements | 2 deferred | 5 exclusions*
