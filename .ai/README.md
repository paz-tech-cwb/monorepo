# AI Project Context

This folder is the canonical project map for AI agents and automation. Read it before changing code.

## Reading order

1. `project.md` — product, users, glossary, source-of-truth rules.
2. `architecture.md` — system architecture, data/auth/API contracts.
3. `conventions.md` — engineering rules agents must follow.
4. `commands.md` — local commands and validation commands.
5. `feature-map.md` — feature index and current status.
6. Relevant `features/*.md` files for the requested work.
7. Relevant `apps/*.md` files for the apps being changed.

## Agent operating rules

- Treat `.ai/` as the highest-level documentation source for this repo.
- If a submodule contains its own agent instructions, read those after this folder and before editing that submodule.
- Do not infer architecture from stale plans if it conflicts with `.ai/`.
- When behavior changes, update the matching `.ai/features/*.md` or `.ai/apps/*.md` file in the same branch.
- Pipeline handoff files live in `.pipeline/`; the user-level ship pipeline controls execution.

## Scope

This is intentionally reusable: other projects can copy the same structure and replace the project/app/feature files while keeping the reading order and pipeline expectations.
