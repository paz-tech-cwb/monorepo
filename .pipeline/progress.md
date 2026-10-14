# Progress: Reunioes UX (shared + Android + iOS)

- [x] Worktree from origin/develop; old pipeline files archived (`archive/*-before-reunioes-ux-2026-10-14.md`)
- [x] Spec + IA mockup + assumptions
- [x] Shared: error kinds, entry resolver, history rules, analytics overview param + tests
- [x] Android: meeting screen states, Reunioes tabs, analytics panel, entry screen, group detail, routing, removal, Home section
- [x] Docs (.ai/features/life-groups.md, mobile-app.md, apps/mobile.md), changes.md, test-results.md
- [ ] Push + draft PR to develop, CI green
- [x] iOS: compile fix (`getOverview(lifeGroupId:)`), error kinds/retry policy, read-only empty state, report-only rendering
- [x] iOS: single full-screen background (`pazScreenBackground`) across Reunião screens + audit of other screens
- [x] iOS: IA (Reuniões row only, segmented Reuniões/Relatórios, scoped analytics panel), entry flow + picker, Home "Meus grupos"
- [x] iOS: standalone report form/list/detail removed; shared LifeGroupReportDraft/Rules/Form + submitLifeGroupReport removed
- [x] iOS tests (94 XCTest green locally) + docs
- [ ] Push + CI green on #103 (android + ios + build)
