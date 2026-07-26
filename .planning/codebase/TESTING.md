# Testing

**Analysis Date:** 2026-07-26

## Framework

- Jest 30.x, `ts-jest` preset, `testEnvironment: 'node'` (`jest.config.js`)
- jsdom 28.x imported directly where DOM needed (not jest-environment-jsdom per-file)
- Commands: `npm test` (verbose), `npm run test:coverage`
- Coverage source: `src/**/*.ts`; codecov config present (`codecov.yml`, CircleCI + AppVeyor)

## Structure

- Tests in `spec/` mirroring `src/` — NOT co-located
- `spec/client/controls.spec.ts` — builds DOM via `new JSDOM(...)`, injects `dom.window.document` into control functions
- `spec/tools/calcPosition.spec.ts` — tests `offsetCalclator.getOffset()` (filename mismatch: "calcPosition" vs "offsetCalclator")
- `spec/tools/platformResolver.spec.ts` — uses `setCustomType('Windows_NT'|'Darwin'|'Linux')` to fake OS
- `spec/types/ipc.spec.ts` — snapshot of `IPCEventNames`
- `spec/ui/menuTemplate.spec.ts`, `spec/ui/contextTemplate.spec.ts` — snapshots of menu arrays
- Snapshots: `spec/**/__snapshots__/*.snap` (committed)

## Mocking

- No jest.mock usage observed; instead:
  - DOM: real JSDOM instance injected as parameter (`document: any` pattern)
  - OS: runtime override via `platformResolver.setCustomType()`
- Electron itself never mocked — everything touching `app`/`BrowserWindow`/`Tray` is untested

## Coverage Gaps

**Untested (high-risk):**
- `src/main.ts` — all window/tray/positioning/IPC logic (biggest file, zero tests)
- `src/tools/settings.ts` — electron-store wrapper
- `src/tools/getNativeIconName.ts` — imports electron `nativeTheme`
- `src/client/index.ts` — preload wiring
- `src/settings/renderer.js` — plain JS, outside ts-jest scope entirely
- `src/tools/getTrayPosition.ts` — pure function, easily testable, but NO spec exists despite being core Windows positioning logic

**Tested:**
- `controls.ts` (happy paths + missing-element), `offsetCalclator`, `platformResolver`, enum/menu snapshots (~99 total spec lines)

## Conventions for New Tests

- Place in `spec/<mirror-of-src-path>/<name>.spec.ts`
- Pure logic: extract from `main.ts` into `src/tools/` first, then test directly
- DOM logic: accept `document` parameter, test with JSDOM
- Menus/enums: snapshot tests acceptable

## CI

- `.circleci/config.yml` and `appveyor.yml` both present (duplicated CI)
- codecov upload configured

---

*Testing analysis: 2026-07-26*
