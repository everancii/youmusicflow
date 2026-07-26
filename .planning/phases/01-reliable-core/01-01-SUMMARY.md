---
phase: 01-reliable-core
plan: 01
status: complete
requirements: [INST-01, CTRL-02]
commits:
  - 3b08a3a fix(test): downlevel jsdom's ESM-only deps so controls suite runs
  - 40655ad feat: add single-instance lock and live media-keys toggle
---

# Summary: Plan 01-01 — Single Instance & Media-Key Toggle

## What was built

- **INST-01**: `app.requestSingleInstanceLock()` at module top; second instance quits, first instance receives `second-instance` → show + focus (null-guarded). Ready handler early-returns without the lock.
- **CTRL-02**: New `enableMediaKeys` setting (default `true`) end-to-end:
  - `settings.ts`: interface + schema entry + getSettings()
  - `index.html`: "Global media keys" checkbox after Always on Top
  - `renderer.js`: init (`!== false`) + change listener via `update-setting` IPC
  - `main.ts`: `registerMediaKeys()`/`unregisterMediaKeys()` (individual unregisters, double-register guard via `isRegistered`); registration gated at ready; live toggle in `update-setting` handler.

## Deviations

- **[Rule: blocking issue] Jest config fix (unplanned)**: `spec/client/controls.spec.ts` failed to run at all — jsdom 28 pulls ESM-only deps (`@exodus/*`, `@csstools/*`, nested `parse5@8`) which Jest can't parse. Added `jest.esm-transformer.js` (TypeScript `transpileModule` downlevel, `.mjs`→`.js` filename trick to bypass TS ESM format detection) + `transformIgnorePatterns` whitelist handling nested node_modules. Pre-existing breakage, not caused by this plan; had to fix to satisfy "npm test passes".

## Verification

- `npm run build` ✓
- `npm test` ✓ — 6/6 suites, 13 tests (controls suite's 3 tests now actually execute)
- grep: `requestSingleInstanceLock`, `unregisterMediaKeys`, `isRegistered` in app/main.js; `enable-media-keys` in app/settings/*; `enableMediaKeys` ×2 in app/tools/settings.js ✓
