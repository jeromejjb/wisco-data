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

### Added

- Glowing Wisconsin outline on the map so the state reads as one shape against the lakes and neighbors.
- Pushing to an `issue/{n}-…` branch with no open PR now opens one into `main` automatically.
- Night-shift workflow (every 8 hours): files the next catalog improvement as a GitHub issue and, when `CURSOR_API_KEY` is set, starts a Cursor cloud agent that opens a PR for approval.

### Fixed

- County boundaries and unemployment shading draw again. MapLibre's background worker was shipped without the file it imports, so every GeoJSON layer stalled on “loading”; the worker now loads from `public/maplibre/`.
- Basemap no longer shows CARTO’s “API KEY REQUIRED” watermark. Streets use CARTO Voyager when `NEXT_PUBLIC_CARTO_API_KEY` is set, otherwise Esri tiles that work without a key.
- County selection, prompt carousel, and map camera moves settle faster so the map feels snappier.
- When Firefox (or any browser) blocks WebGL, the map still draws as a 2D tile map instead of a dead-end error screen.
- Ensure-PR job explains when GitHub Actions is blocked from opening pull requests, instead of dumping a Node stack trace.
- Tapping a carousel prompt now shows the asked question and its data (news headline, county numbers) on phones, not only on the map.

### Changed

- Feature work starts as a GitHub issue, then a dedicated `issue/{n}-…` branch and pull request into `main`. Pushing more work to that branch without an open PR opens one automatically.
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
