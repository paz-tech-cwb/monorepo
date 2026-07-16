# Spec: AI Project Context Architecture

## Request

Create a reusable AI documentation architecture so agents and harnesses can understand the project by project context, architecture, features, apps, commands, and pipeline expectations. Archive/remove older active docs, agent files, superpowers, planning files, and update the user-level ship pipeline to use this architecture.

## Context files read

- `CLAUDE.md`
- `AGENTS.md`
- `README.md`
- `docs/design-system.md`
- `docs/formularios.md`
- `docs/member-journey-steps.md`
- `docs/notification-navigation.md`
- `docs/wip-features.md`
- `package.json`
- `.gitmodules`
- `/Users/jonathalima/.claude/commands/ship.md`
- `/Users/jonathalima/.codex/prompts/ship.md`
- `/Users/jonathalima/.agents/skills/ship-pipeline/SKILL.md`

## Affected areas

- Root repo documentation.
- Agent entrypoint files.
- Historical docs archive.
- User-level ship pipeline definitions.
- Pipeline handoff expectations.

## Implementation plan

1. Create `.ai/` as the canonical AI context folder.
2. Add project-level docs: project, architecture, conventions, commands, feature map.
3. Add feature docs for auth, membership, life groups, forms, notifications, ministries, admin dashboard, mobile, and deployment.
4. Add app docs for root, backend, admin-ui, mobile, and postman-files.
5. Add `.ai/pipelines/handoff-template.md` only, not a repo-local executable ship pipeline, because execution lives at user level.
6. Replace root `AGENTS.md` and `CLAUDE.md` with thin pointers to `.ai/README.md`.
7. Simplify `README.md` for human onboarding and link to `.ai/`.
8. Archive historical docs and remove them from active docs paths.
9. Update user-level ship pipeline files to require `.ai/` context, `.pipeline/progress.md`, and draft PR creation after the first branch commit.

## API/data/auth impacts

None. Documentation-only change.

## Validation plan

- Verify `.ai/` files exist.
- Verify old active docs were archived.
- Verify user-level ship pipeline references `.ai/`, `.pipeline/progress.md`, and first-commit PR creation.
- No app tests required because no product code changed.

## Open questions

None.
