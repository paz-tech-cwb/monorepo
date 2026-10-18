# Spec: Reunioes UX (client fixes + information architecture), shared + Android (iOS follows on the same branch)

Branch `feat/life-group-reunioes-ux`, from `origin/develop` (c8f13d25). Backend work (404 root cause, stable error codes, read-only draft for past dates, group-scoped analytics) is done by another agent on `fix/meetings-404-analytics-scope`; this branch is client-only and must not touch `backend/`.

Context: TestFlight build of release #101, group "Centro" (life group 2), user is leader. `GET /life-groups/2/meetings/2026-09-08` returned 404 and the screen said "Grupo nao encontrado". Probable root cause (backend agent proves it): the deploy of release 84f1dd9e failed, so `/meetings` routes did not exist (generic Nest 404 `Cannot GET ...`, no `code`).
Why the app opened 2026-09-08: it is not a default. The history ("Reunioes") lists attendance records and legacy weekly reports by date; the user tapped a past row (2026-09-08 is a Tuesday = the group's regular day, 5 weeks back), which navigates to `life_group_meeting/2/2026-09-08`. "Nova reuniao" defaults to the latest regular date <= today, never a stale date. Past dates therefore must never show an error screen.

## Items
1. Errors (shared `LifeGroupMeetingErrors`): 404 + `group_not_found` -> "Grupo nao encontrado"; 404 without a code (route missing / server not updated) -> "Recurso indisponivel no servidor. Tente novamente mais tarde." (never "group not found"); 403 -> no permission; network -> offline + retry. A past date with no record is NOT an error: read-only empty state "Nao ha reuniao registrada nesta data."; outside the edit window -> read-only banner with the deadline.
2. Double background: audit all Reuniao screens, one full-screen background only. Document the exact pattern for iOS.
3. Information architecture (below).
4. Group-scoped stats: client sends `life_group_id` (attendance + distribution already do); single-group view drops church-wide / "without group" metrics.
5. Home: several life groups -> ONE section card with a header and one row per group separated by dividers; per-group tasks, tap, "Ver todos (N)", cap 3 and single-group case unchanged.

## Information architecture (decided; the user may veto)

```
LIFE GROUP SCREEN                          REUNIOES SCREEN
+--------------------------------+         +------------------------------------+
| <  Centro                  [gear]         | <  Reunioes                        |
| Lider: Fulano                  |         | [ Reunioes | Relatorios ]  segmented |
| Terca-feira, 20:00 · 12 membros|         +------------------------------------+
|                                |         | TAB Reunioes                        |
| (Minhas tarefas card)          |         |  14/10/2026  [Presenca 9/12]        |
| Reunioes                     > |         |              [Relatorio enviado]  > |
| Membros                      > |         |  07/10/2026  [Presenca 8/12]        |
| Estudo do Life               > |         |              [Relatorio pendente] > |
| Elegibilidade p/ tarefas     > |  (leader|  01/09/2026  [Relatorio enviado]  > |  legacy: report only
|                                |  /co-ldr|                         [Nova reuniao] (writers only)
| REMOVED: Enviar relatorio,     |  only)  | TAB Relatorios: this group's stats  |
| Relatorios semanais,           |         |  (year/month chips, attendance chart,|
| Relatorios (stats)             |         |   summary; no group picker)         |
+--------------------------------+         +------------------------------------+
Tapping a row -> REUNIAO screen (Presenca per person + Relatorio in one screen; past report read inside it, read-only when not editable; legacy report-only rows: presence section says "sem presenca registrada").
Formularios entry / `paz://form/life-group-reports` -> Reuniao flow:
  one led group            -> that group's Reunioes screen directly
  several led groups / admin / pastor -> group picker -> Reunioes
  supervisor only          -> group picker (supervised groups) -> read-only Reunioes
  nothing                  -> message
```

## Assumptions (defaults chosen)
- A1: Backend answers 200 (read-only draft) for a past date without a record and ships codes (`group_not_found`, ...). Until it is deployed the client also treats the legacy Nest message `Life group with ID N not found` as group-not-found; any other 404 is "unavailable".
- A2: `life_group_id` is the query param of the analytics endpoints (already supported by the backend today). Overview is not requested for the single-group tab.
- A3: Legacy weekly report rows open the same Reuniao screen (GET meetings returns the legacy report); no change to the report/attendance write flow.
- A4: Supervisors see Reunioes read-only (no "Nova reuniao"); gate to reach it unchanged (`canViewLifeGroupReports`).
- A5: Standalone form code is removed on Android; shared `LifeGroupReportDraft`/`LifeGroupReportRules`/`LifeGroupReportForm`/`FormsRepository.submitLifeGroupReport` stay until the iOS agent removes its form (iOS still compiles against them), then are deleted. Backend `POST /forms/life-group-reports` untouched (old builds).
- A6: "Todos os grupos" analytics (Account > Relatorios) keeps its group dropdown and church-wide cards.

## Scope
Shared: `LifeGroupMeetingErrors` (kinds), `LifeGroupMeetingRules` (entry resolver, history row rules, empty-state), `LifeGroupAnalyticsRepository.getOverview(lifeGroupId)`, tests.
Android: Reunioes screen with tabs, meeting screen states, analytics panel extraction + single-group mode, entry/picker screen, group detail rows, Formularios/deep-link routing, removal of dead screens, Home grouped card, tests, docs.

## Out of scope
iOS UI, backend, reminders, push copy, admin-ui.

## Acceptance
Shared tests green (`:shared:iosSimulatorArm64Test`); Android verified by CI only (SDK not installed locally): UNVERIFIED locally.
