---
plan: 04-01
status: complete
commits: [d19f9b9, b1efcd8, aeb6908]
---

# Summary 04-01: Dependency Cleanup + GitHub Actions + Honest Docs

## Done
- Removed dead deps: `@types/semver`, `electron-log`, `codecov`, `standard-version` (npm uninstall; lockfile regenerated). Deleted `yarn.lock` + `codecov.yml`. Build + 58 tests green after removal. (d19f9b9)
- Added `.github/workflows/ci.yml` — matrix ubuntu/macos/windows, node 22, npm cache, `npm ci` → build → test, push(main)+PR triggers. Deleted `.circleci/config.yml` + `appveyor.yml` from disk. (b1efcd8)
- Rewrote AGENTS.md: real `main-process/` module tree, navigation policy, now-playing, offline fallback, contextIsolation settings window, GH Actions CI note; removed false auto-update / ad-block / S3 / `@ts-ignore` claims. (aeb6908)

## Deviations
- `codecov.yml`, `.circleci/config.yml`, `appveyor.yml` were never git-tracked — deleted from disk only; no commit needed for their removal.
- `.gitignore` still contains a `codecov` line — inert ignore entry, left alone.

## Verification
- `npm run build` clean; jest 9/9 suites, 58 tests.
- `git grep -il "circleci|appveyor|codecov"` (excl. node_modules/.planning/lockfile) → only `.gitignore`.
- No `yarn.lock`; single `package-lock.json`.
