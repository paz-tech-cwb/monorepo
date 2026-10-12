# Feature: Mobile App

## Purpose

Member-facing mobile experience for account, journey, forms, notifications, ministries, academy, and life group flows.

## Current mobile workstream

- `kmp-mobile/`: Kotlin Multiplatform mobile app workstream.

## Design system summary

KMP mobile design tokens historically include:

- Primary blue `#043A6F`.
- Secondary blue `#6784AE`.
- Light/dark surface/background palettes.
- Reusable components such as PazButton, PazCard, PazTopBar, PazBottomNavBar, PazMenuRow, PazAvatar, PazTextField, and PazEmptyState.

Keep platform implementations visually aligned unless intentionally redesigning.

## Navigation integrations

- Notification deep links must map to mobile routes.
- Form notifications route to Formulários.
- Member journey reminders route to Minha Jornada.
- Entity-specific routes require IDs in notification payloads.
- Life group tasks: `paz://tarefa/{assignmentId}` opens the task guide
  (Android route `life_group_task/{assignmentId}`; iOS `.lifeGroupTaskGuide`).

## Life group tasks (Android + iOS)

- Task guide screen: name, group, meeting date, description, markdown guidance, destructive "Não posso" (confirmation; "Tarefa devolvida" state).
- "Minhas tarefas" card on life group detail (assigned tasks of that group; hidden when empty) AND folded into the home life group card(s) (see below; up to 3 upcoming assigned tasks per group, `meetingDate >= today`, soonest first; each row opens the guide).
- Leader/co-leader-only "Elegibilidade para tarefas" screen (route `life_group_task_members/{lifeGroupId}`): min-presence stepper, per-member eligibility, note, template exclusions, "Voltar ao automático".
- Shared KMP: `LifeGroupTaskRepository` (Ktor, Koin; iOS via `IosAppContainer.lifeGroupTaskRepository`).
- Markdown rendering is hand-rolled on both platforms: headings, lists, bold/italic, fenced code blocks, inline code, blockquotes, links limited to http/https. Clients only rely on the member DTO `grandfathered` boolean (never on a note marker string); `declined_user_ids` is backend-internal. Copy is inline pt-BR.

## Life group home card and per-group reports (shared + Android + iOS)

- Home: one card per life group the viewer belongs to (`GET /life-groups/me`): name, "Líder: X", meeting "day às time" (`lifeGroupMeetingLabel`), member count, tap opens the group detail; the viewer's upcoming tasks for that group are folded in ("Minhas tarefas", max 3 per card). Replaces the standalone tasks card. Order: groups the viewer leads/co-leads first, then by name; max 3 cards, then a "Ver todos (N)" row opening the Life Groups screen. Hidden with no group (discovery CTA instead, mutually exclusive). Pure builder `buildHomeLifeGroupCards` / `selectUpcomingLifeGroupTasks` in `:shared` (`HomeLifeGroupCard.kt`) so both platforms share one rule.
- Degradation (never a home error): groups fetch fails -> no cards and no discovery CTA, but if tasks loaded the legacy tasks-only card still renders (only case where it does); tasks fetch fails -> cards without the tasks section; both fail -> nothing. Fetches are independent; cancellation is rethrown.
- Life group detail gate `canViewGroupReports` (`canViewLifeGroupReports`): this group's leader/co-leader (id match, works for a co-leader with role `member`) OR role admin/pastor/area_leader/sector_leader. A `life_group_leader` of another group, members, disciplers and guests do not see the entries. Backend stays the source of truth (403/404 for out-of-scope groups).
- Two sibling rows when the gate passes: "Relatórios" (existing analytics, now locked to the group: `LifeGroupAnalyticsUiState.isScopedToGroup` hides the "Todos os grupos" dropdown) and "Relatórios semanais" (new, read-only).
- "Relatórios semanais": list of the group's weekly reports (`LifeGroupReportRepository.getReports(lifeGroupId)` -> `GET /forms/life-group-reports?life_group_id=`, newest first, pull-to-refresh, loading/error/empty "Nenhum relatório enviado"/no-access states; 403 = no access) and read-only detail (`getReport(id)`; 403/404 = "Relatório não encontrado ou sem acesso"). Android routes `life_group_reports/{lifeGroupId}`, `life_group_report/{reportId}`; package `ui/features/lifegroupreports/`. iOS: pushed `NavigationLink`s to `LifeGroupReportsView` / `LifeGroupReportDetailView` (`Features/LifeGroupReports/`), gate `LifeGroupDetailView.canViewGroupReports(role:isGroupLeadership:)`, analytics scoped via `LifeGroupAnalyticsViewModel.isScopedToGroup`; home via `HomeViewModel.resolveLifeGroups` + `LifeGroupHomeCard` ("Ver todos (N)" opens `LifeGroupsView`). No "Novo relatório" (mobile submission payload does not match the backend DTO; separate ticket).
- Shared KMP: `LifeGroupReportRepository` + `LifeGroupWeeklyReport` (tolerant parsing of array/string multi-value fields, string/number `offering`); iOS via `IosAppContainer.lifeGroupReportRepository`.

## Agent notes

- Read kmp-mobile's local files before proposing mobile changes.
- Keep auth refresh behavior consistent with backend contract.

## Life group relationship (supervisors)

`GET /life-groups/me` also returns groups the viewer supervises (area/sector
leader or co-leader) with `relationship` (`leader` | `co_leader` | `supervisor` |
`member`) and `is_supervised`; the shared Kotlin `LifeGroup` exposes them as
`relationship` / `isSupervised` (optional). Ranking/cap for the home card for
supervisors is an open product question (see `features/life-groups.md`).
