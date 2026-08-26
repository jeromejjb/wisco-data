# Changelog

All notable changes to Wisconsin Workways are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Releasing

1. Add a `## [X.Y.Z] - YYYY-MM-DD` section at the top of this file.
2. Set `"version"` in `package.json` to `X.Y.Z` (or run `npm version <patch|minor|major> --no-git-tag-version`).
3. Open a PR into `main`. After merge, tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. GitHub Actions publishes a GitHub Release from the tag.

## [Unreleased]

### Changed

- Feature work starts as a GitHub issue, then a dedicated `issue/{n}-…` branch and pull request into `main`.
- CI (lint, test, build) must pass before production Vercel deploy. Deploy runs only after a merge (or push) to `main`, not on pull requests.
- Removed the old “open issues from commits already on main” catalog workflow.

## [0.2.0] - 2026-08-25

### Added

- GitHub CI (lint, tests, production build) and optional Vercel deploy.
- Feature-issue catalog sync from shipped work.
- App version shown in the site footer; GitHub Releases from `v*` tags.

### Changed

- Statewide location resolution and agent error classification.
- Removed Claude Code project files (`CLAUDE.md`, `.claude/`) from the repository. Next.js agent rules stay in `AGENTS.md`.

## [0.1.0] - 2026-08-22

### Added

- Initial Wisconsin Workways map: jobs, local economics, transit, and the map agent.
