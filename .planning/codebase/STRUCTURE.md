# Codebase Structure

**Analysis Date:** 2026-07-26

## Directory Layout

```
youmusicflow/
├── src/                  # TypeScript source (compiles to app/)
│   ├── main.ts           # Main process entry
│   ├── client/           # Preload script + DOM controls
│   ├── tools/            # Helpers (platform, tray position, settings)
│   ├── types/            # Shared types (IPC event names)
│   ├── ui/               # Menu/context-menu templates
│   ├── settings/         # Settings window (plain HTML/CSS/JS, copied not compiled)
│   └── mini-player/      # Empty (planned)
├── app/                  # Build output (gitignored, never edit)
├── spec/                 # Jest tests (mirrors src/, NOT co-located)
├── assets/               # Icons (tray light/dark, icns, ico, png)
├── openspec/             # OpenSpec change proposals + specs
├── docs/                 # release.md
├── release/              # electron-builder output (gitignored)
├── copy-assets.js        # Copies src/settings → app/settings on build
├── package.json          # Scripts + electron-builder config
├── tsconfig.json         # src → app compilation
├── jest.config.js        # ts-jest, node env
└── AGENTS.md             # Agent instructions
```

## Directory Purposes

**`src/`:**
- Purpose: all first-party source
- Key files: `src/main.ts` (everything main-process), `src/client/index.ts` (preload), `src/client/controls.ts` (DOM control functions)
- Note: `src/settings/` is plain JS/HTML — excluded from tsc, copied verbatim

**`app/`:**
- Purpose: build output (`tsc` + `copy-assets.js`)
- Committed: No (gitignored) — regenerate with `npm run build`; never hand-edit

**`spec/`:**
- Purpose: Jest tests mirroring `src/` structure
- Key files: `spec/client/controls.spec.ts` (JSDOM), `spec/tools/calcPosition.spec.ts`, `spec/tools/platformResolver.spec.ts`, `spec/types/ipc.spec.ts` (snapshot), `spec/ui/*.spec.ts` (snapshots)
- Snapshots: `spec/**/__snapshots__/`

**`assets/`:**
- Purpose: icons; `icon_dark.png` / `icon_light.png` for tray theme variants, `mac/icon.iconset/` for icns generation

**`openspec/`:**
- Purpose: spec-driven change management
- Active change: `openspec/changes/microsoft-store-release-build/`
- Archived: renames to YouMusic/YouMusicFlow

## Key File Locations

**Entry Points:**
- `src/main.ts`: Electron main process
- `src/client/index.ts`: preload for music.youtube.com window

**Configuration:**
- `tsconfig.json`: TS build (src → app)
- `package.json` `build` key: electron-builder (mac/win/appx/nsis)
- `.prettierrc`: no semicolons, single quotes
- `youmusicflow-config.json`: sample defaults only (runtime config lives in user-data dir)

**Core Logic:**
- `src/tools/settings.ts`: electron-store schema + accessors
- `src/tools/getTrayPosition.ts`: taskbar/tray edge detection (pure)
- `src/tools/offsetCalclator.ts`: per-OS pixel offsets (typo filename — do not rename without updating `src/main.ts` import)

**Testing:**
- `spec/`: all tests; run `npm test`

## Naming Conventions

**Files:**
- camelCase for TS modules: `getTrayPosition.ts`, `menuTemplate.ts`
- `*.spec.ts` for tests (in `spec/`, not next to source)
- Note mismatch: `spec/tools/calcPosition.spec.ts` tests `offsetCalclator.ts` (names don't align)

**Code:**
- PascalCase enums (`TrayPosition`, `Platforms`, `IPCEventNames`)
- `create*` factories for menu templates
- Namespace imports for tools: `import * as PlatformResolver from ...`

## Where to Add New Code

**New main-process feature:**
- Primary code: `src/main.ts` (or new module in `src/tools/` — prefer extraction, main.ts is bloated)
- Tests: `spec/tools/*.spec.ts`

**New renderer control (YouTube Music DOM):**
- Implementation: `src/client/controls.ts` (accept `document: any` for testability)
- Wiring: `src/client/index.ts` + channel in `src/types/ipc.ts`
- Tests: `spec/client/controls.spec.ts` (JSDOM)

**New setting:**
- Schema + interface: `src/tools/settings.ts`
- UI: `src/settings/index.html` + `renderer.js` (plain JS!)
- Side effects: `update-setting` handler in `src/main.ts`

## Special Directories

**`app/`:** build output, gitignored, regenerated each build
**`release/`:** electron-builder artifacts, gitignored
**`src/mini-player/`:** empty placeholder; a compiled `app/mini-player/` exists from an earlier experiment (stale)
**`.claude/skills/`, `.cursor/`, `.gemini/`, `.trae/`:** agent tooling configs, not app code

---

*Structure analysis: 2026-07-26*
*Update when directory structure changes*
