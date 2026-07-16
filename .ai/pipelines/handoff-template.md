# Pipeline Handoff Expectations

The executable ship pipeline is configured at user level. This repo defines the expected handoff files only.

## Files

```txt
.pipeline/spec.md
.pipeline/progress.md
.pipeline/changes.md
.pipeline/test-results.md
.pipeline/review.md
```

## `.pipeline/spec.md`

Must include:

- feature request summary;
- `.ai/` context files read;
- affected apps/features;
- implementation plan;
- API/data/auth impacts;
- validation plan;
- `OPEN QUESTIONS` section only when the pipeline must stop for user input.

## `.pipeline/progress.md`

Must be created with the spec and updated after each stage/meaningful implementation milestone.

Recommended shape:

```md
# Progress

## Request

<short request>

## Status

- [x] Context reviewed
- [x] Spec created
- [ ] First branch commit created
- [ ] PR opened
- [ ] Implementation complete
- [ ] Tests complete
- [ ] Review complete

## Timeline

- YYYY-MM-DD HH:mm — note

## Current branch / PR

- Branch: <branch>
- PR: <url or pending>
```

## `.pipeline/changes.md`

Must include changed files, behavior changes, docs updated, migration notes, and follow-ups.

## `.pipeline/test-results.md`

Must include commands run, pass/fail status, failures, and commands not run with reason.

## `.pipeline/review.md`

Must include verdict (`SHIP` or not), blocking issues, non-blocking issues, and evidence reviewed.
