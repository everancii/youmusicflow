# Conventions

**Analysis Date:** 2026-07-26

## Code Style

**Formatting (Prettier-enforced, `.prettierrc`):**
- No semicolons in TS source
- Single quotes
- Exception: `src/settings/renderer.js` and `src/tools/settings.ts` use semicolons + 4-space indent (drift — settings.ts predates format run)
- Run `npm run format` (covers `src/**/*.{js,ts}` only)

**TypeScript:**
- `strict: true` but `noImplicitAny: false` — implicit any allowed
- `@ts-ignore` used liberally in `src/tools/settings.ts` (electron-store typing friction) and once in `src/main.ts` (custom `app.on('open-settings')` event)
- Controls accept `document: any` — deliberate, enables JSDOM injection in tests

## Naming

- camelCase files for modules: `getNativeIconName.ts`, `offsetCalclator.ts`
- PascalCase for enums and their members quoted values: `TrayPosition.Bottom`, `Platforms.Mac`
- `create*` prefix for template factories: `createMenuTemplate`, `createContextTemplate`
- SCREAMING_SNAKE for main-process constants: `WINDOW_WIDTH`, `WINDOW_HEIGHT`
- IPC channels: kebab-ish strings (`get-settings`, `update-setting`) for settings; enum-backed (`play/pause`, `prev`, `next`) for media

## Import Patterns

- Namespace imports for tool modules: `import * as PlatformResolver from './tools/platformResolver'`
- Named imports from electron: `import { app, BrowserWindow, ... } from 'electron'`
- Settings renderer uses CommonJS: `const { ipcRenderer } = require('electron')` — plain JS, not compiled

## Patterns

**Pure functions over classes:** no classes anywhere; modules export functions
**Data-as-config:** menus defined as `MenuItemConstructorOptions[]` arrays
**Test seams via mutable module state:** `platformResolver.setCustomType()` overrides `os.type()` at runtime
**Guard-and-return:** controls return boolean success instead of throwing

## Error Handling

- Minimal: null-checks then silent no-op (`if (btn) { btn.click(); return true } return false`)
- No custom error types, no try/catch, no user-facing error surfaces
- `nativeImage.isEmpty()` checked before dock icon set

## Comments

- Sparse, explanatory where present (positioning logic in `src/main.ts` has per-case comments)
- Commented-out devtools block kept in `src/main.ts`
- English comments throughout

## Git/Process

- Conventional commits observed: `feat(ui):`, `chore:`, `docs:`
- OpenSpec workflow for larger changes (`openspec/changes/*` with proposal/design/tasks/specs)
- AGENTS.md is the canonical contributor guide; keep it accurate when behavior changes

---

*Conventions analysis: 2026-07-26*
