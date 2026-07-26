# Technology Stack

**Analysis Date:** 2026-07-26

## Languages

**Primary:**
- TypeScript 5.9 - Main process, preload, tools, UI templates (`src/**/*.ts`)

**Secondary:**
- JavaScript (plain, CommonJS) - Settings window renderer (`src/settings/renderer.js`), build helpers (`copy-assets.js`, `download-icon.js`, `resize-icon.js`)
- HTML/CSS - Settings window UI (`src/settings/index.html`, `src/settings/style.css`)

## Runtime

**Environment:**
- Electron 40.x (Chromium + Node) - desktop app runtime
- Node.js (dev machine uses fnm, v24.x) - build/test tooling only

**Package Manager:**
- npm - `package-lock.json` present (a `yarn.lock` also exists in repo — potential drift; npm is what scripts assume)

## Frameworks

**Core:**
- Electron 40.8.x - windowing, tray, globalShortcut, IPC
- No frontend framework — the "UI" is https://music.youtube.com loaded into a BrowserWindow

**Testing:**
- Jest 30.x with ts-jest preset, `node` test environment
- jsdom 28.x used directly in `spec/client/controls.spec.ts` for DOM simulation

**Build/Dev:**
- TypeScript compiler (`tsc`): `src/` → `app/` (see `tsconfig.json`)
- `copy-assets.js`: copies settings HTML/CSS/JS verbatim to `app/settings/`
- electron-builder 26.x: packages to `release/` (mac, win nsis + appx)
- Prettier 3.x: formatting (no semicolons, single quotes — `.prettierrc`)

## Key Dependencies

**Critical:**
- electron-store 8.x - persistent settings, config name `youmusicflow-config` (`src/tools/settings.ts`)
- electron-log 5.x - declared in dependencies (usage minimal after auto-update removal)

**Suspicious/cleanup candidates:**
- `@types/semver` in `dependencies` - should be devDependencies; likely orphaned after auto-update removal
- `standard-version`, `codecov`, `to-ico-cli` in devDependencies - release/CI helpers

## Configuration

**Environment:**
- No environment variables required at runtime
- Runtime user settings via electron-store in OS user-data dir (key: `youmusicflow-config`)
- `youmusicflow-config.json` at repo root is a sample/defaults file only

**Build:**
- `tsconfig.json` - target es2020, commonjs, strict (but `noImplicitAny: false`), outDir `./app`, excludes `**/*.spec.ts`
- `package.json` `build` section - electron-builder config (appId `jp.elevenback.youmusicflow`, mac LSUIElement, win nsis+appx)
- `jest.config.js` - ts-jest preset, coverage from `src/**/*.ts`

## Platform Requirements

**Development:**
- macOS/Windows/Linux with Node.js; AppX target buildable only on Windows

**Production:**
- macOS: dmg-style app, tray-only (`LSUIElement: 1`)
- Windows: NSIS installer + AppX (Microsoft Store) — appx `publisher` still placeholder `CN=YourPartnerCenterPublisher`
- Auto-update removed; Microsoft Store handles updates for appx (comment in `src/main.ts`)

---

*Stack analysis: 2026-07-26*
*Update after major dependency changes*
