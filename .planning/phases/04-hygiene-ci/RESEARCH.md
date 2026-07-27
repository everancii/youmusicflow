# Phase 4 Research: Hygiene & CI

## Findings

### Dead dependencies (HYG-01+)
- `@types/semver` — zero imports anywhere (required removal).
- `electron-log` (prod dep) — zero imports; was used by deleted auto-update.ts. Dead → remove.
- `codecov` (dev dep) — npm uploader is officially deprecated/sunset; no script references it. Dead → remove, plus `codecov.yml`.
- `standard-version` — deprecated upstream, no npm script uses it. Dead → remove.
- Keep: `to-ico-cli` (used by resize-icon/download-icon scripts), everything else in active use.

### Lockfiles (HYG-02)
- Both `yarn.lock` (259KB, stale — Jul 17) and `package-lock.json` exist. npm is canonical (all docs/scripts use npm). Delete yarn.lock; regenerate package-lock via `npm install` after dep removals.

### CI (HYG-03)
- `.circleci/config.yml` + `appveyor.yml` exist — both replaced by one GitHub Actions workflow `.github/workflows/ci.yml`:
  - matrix: `ubuntu-latest`, `macos-latest`, `windows-latest`; node 22 (Electron 40 ships node 22)
  - steps: checkout → setup-node with npm cache → `npm ci` → `npm run build` → `npm test`
  - triggers: push to main + pull_request
  - No codecov upload step (uploader removed); coverage stays local via `npm run test:coverage`.
- Linux needs no display for build+jest (no electron launch in tests) — plain runner is fine.

### AGENTS.md truth (HYG-04)
Confirmed false/stale claims:
- L27/73: `tools/auto-update.ts` self-updater — file deleted phases ago
- L71: ad/tracker blocking via `webRequest.onBeforeRequest` — never existed in code
- L76: S3 binary publishing (`youmusicflow-binaries`) — no publish config in package.json
- Architecture tree predates phase 2/3: no `main-process/` modules, no `navigationPolicy`, no `nowPlaying`, no `offline/`, settings window described as `nodeIntegration:true` (now contextIsolation+preload), window described fixed-size (now resizable)
- CI table/docs reference CircleCI/AppVeyor after this phase — must say GitHub Actions
- copy-assets description: now copies settings **and** offline assets

## Risks
- `npm install` after removals rewrites package-lock — commit it in the same change.
- Deleting CI configs is safe (no external state), but do it in the same commit as adding GH Actions so there's no CI-less window.

## Plan split
- **04-01** (wave 1, single plan per roadmap): deps/lockfile cleanup → GH Actions workflow (+ delete CircleCI/AppVeyor/codecov.yml) → AGENTS.md rewrite. [HYG-01..04]
