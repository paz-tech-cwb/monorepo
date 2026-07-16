# Review: AI Project Context Architecture

## Verdict

SHIP

## Evidence reviewed

- `.ai/README.md` defines canonical agent reading order.
- `.ai/project.md`, `.ai/architecture.md`, `.ai/conventions.md`, `.ai/commands.md`, and `.ai/feature-map.md` provide reusable project context.
- `.ai/features/*` and `.ai/apps/*` organize context feature-by-feature and app-by-app.
- `.ai/pipelines/handoff-template.md` defines spec/progress/changes/test/review handoff expectations without adding an executable repo-local ship pipeline.
- `AGENTS.md` and `CLAUDE.md` now point agents to `.ai/README.md`.
- `README.md` remains human-focused and links to `.ai/`.
- Historical docs were archived under `docs/archive/` and `.ai/archive/`.
- User-level ship pipeline definitions were updated outside the repo to require `.ai/` context, `.pipeline/progress.md`, and draft PR creation after the first commit.
- Draft PR opened: https://github.com/paz-tech-cwb/monorepo/pull/1

## Blocking issues

None.

## Non-blocking notes

- `origin/develop` does not exist, so this PR targets `main`.
- Documentation-only change; no app tests were required or run.
- The working tree still has unrelated pre-existing local files/changes that were intentionally not included in this PR.
