# Progress

## Request

Home screen life group card (Android + iOS) folding the "Minhas tarefas" card into it, plus per-group report access for leader/co-leader inside the life group detail (backend authorization verified; changes only if needed).

## Status

- [x] Context reviewed
- [x] Spec created (.pipeline/spec.md)
- [ ] User answers to open questions (Q1-Q6; none block Phases 0-3)
- [ ] First branch commit created (spec commit only)
- [ ] PR opened
- [ ] Phase 0 backend characterization
- [ ] Phase 1 backend (serializer/mapper, scoped list + co-leader fallback, scope-aware findOne/audit)
- [ ] Phase 2 shared (LifeGroupReportRepository, buildHomeLifeGroupCards)
- [ ] Phase 3 home card Android + iOS
- [ ] Phase 4 detail report entries + weekly reports list/detail + analytics scoped mode
- [ ] Phase 5 docs
- [ ] Tests complete
- [ ] Review complete

## Timeline

- 2026-10-12 — Grant: investigated code; key findings: (1) per-group "Relatorios" (analytics) row already exists on both platforms; (2) life-group-reports GET has no co-leader fallback, no life_group_id filter, no scope check on :id/audit, and likely serializes entities to `{}`; (3) mobile weekly-report submission payload does not match the backend DTO (pre-existing bug, "Novo relatorio" deferred). Spec written, awaiting gate.

## Current branch / PR

- Branch: feat/life-group-home-card
- PR: pending
