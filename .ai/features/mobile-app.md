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

- Home: ONE card ("Meus grupos" section, see "Reuniões UX") for the life groups the viewer belongs to (`GET /life-groups/me`; was one card per group): name, "Líder: X", meeting "day às time" (`lifeGroupMeetingLabel`), member count, tap opens the group detail; the viewer's upcoming tasks for that group are folded in ("Minhas tarefas", max 3 per card). Replaces the standalone tasks card. Order: groups the viewer leads/co-leads first, then by name; max 3 cards, then a "Ver todos (N)" row opening the Life Groups screen. Hidden with no group (discovery CTA instead, mutually exclusive). Pure builder `buildHomeLifeGroupCards` / `selectUpcomingLifeGroupTasks` in `:shared` (`HomeLifeGroupCard.kt`) so both platforms share one rule.
- Degradation (never a home error): groups fetch fails -> no cards and no discovery CTA, but if tasks loaded the legacy tasks-only card still renders (only case where it does); tasks fetch fails -> cards without the tasks section; both fail -> nothing. Fetches are independent; cancellation is rethrown.
- Life group detail gate `canViewGroupReports` (`canViewLifeGroupReports`): this group's leader/co-leader (id match, works for a co-leader with role `member`) OR role admin/pastor/area_leader/sector_leader. A `life_group_leader` of another group, members, disciplers and guests do not see the entries. Backend stays the source of truth (403/404 for out-of-scope groups).
- Standalone "Enviar relatório" form (Phase 0), the weekly reports list/detail and the per-group "Relatórios" row were REMOVED from the Android group detail by the Reuniões UX rework and from the iOS group detail (see "Reuniões UX" below). The backend `POST /forms/life-group-reports` is untouched so old app builds keep working. The shared `LifeGroupReportDraft`/`LifeGroupReportRules`/`LifeGroupReportForm`/`FormsRepository.submitLifeGroupReport` and their tests were deleted once iOS stopped using them.
- Shared KMP: `LifeGroupReportRepository` + `LifeGroupWeeklyReport` (tolerant parsing of array/string multi-value fields, string/number `offering`); iOS via `IosAppContainer.lifeGroupReportRepository`.

## Agent notes

- Read kmp-mobile's local files before proposing mobile changes.
- Keep auth refresh behavior consistent with backend contract.
- The "Membros" row in ministry and life group detail (iOS) / ministry detail (Android) carries a people icon like its neighbor rows. Android's life group detail now has a "Membros" row too (route `life_group_members_list/{lifeGroupId}`), shown when the roster is visible to the viewer.

## Life group relationship (supervisors)

`GET /life-groups/me` also returns groups the viewer supervises (area/sector
leader or co-leader) with `relationship` (`leader` | `co_leader` | `supervisor` |
`member`) and `is_supervised`; the shared Kotlin `LifeGroup` exposes them as
`relationship` / `isSupervised` (optional). Ranking/cap for the home card for
supervisors is an open product question (see `features/life-groups.md`).

## Life group meetings: combined "Reunião" screen (shared + Android + iOS)

- Life group detail: the "Presença" card became "Reuniões" (gate `canViewGroupReports`) opening the meetings history (Android route `life_group_meetings/{lifeGroupId}`, package `ui/features/lifegroupmeeting/`): one row per date with chips "Presença x/y" and "Relatório enviado/pendente" (merged client side from the existing attendance history and reports list endpoints), "Nova reunião" with a date picker (no future dates; defaults to the latest regular meeting day; groups without a fixed day open today). Fixed-day groups can record another weekday with the "Reunião extra" switch (`extra_meeting`).
- Tapping a row, "Nova reunião" and the `paz://presenca/{lifeGroupId}/{date}` push (legacy route `life_group_attendance_editor/{lifeGroupId}/{date}` kept as an alias) open `life_group_meeting/{lifeGroupId}/{date}`: Presença (roster toggles, "Todos presentes", counts, "Salvar presença") then Relatório (read-only "Comprometidos"/"Presentes", counts, offering, Tadel/Culto chips, free-text activity lists, "Salvar relatório"). Presence is saved first; the report is locked until then and when the group has no sector/area. After `edit_deadline` (14 days, admins bypass) the screen is read-only.
- iOS mirrors Android in `Features/LifeGroupMeeting/` (history pushed from the "Reuniões" row, "Nova reunião" date-picker sheet, same Presença/Relatório sections, read-only banner with the deadline, "Reunião extra" switch when the GET answers `extra_meeting_required`). `paz://presenca/{id}/{date}` keeps the `lifeGroupAttendanceEditor` destination and opens the combined screen. Tests: `PazChurchTests/LifeGroupMeetingViewModelTests.swift`.
- Unsaved edits are kept locally per (user, group, date) and restored with a banner; cleared on logout. Full contract and rules: `features/life-groups.md` ("Combined Reunião screen").

## Reuniões UX (information architecture, errors, backgrounds, Home) (shared + Android + iOS)

Life group screen rows (final): header (name, leader, meeting day/time, members count), "Minhas tarefas" when any, then `Reuniões >` (gate `canViewGroupReports`), `Membros >`, `Estudo do Life >`, `Elegibilidade para tarefas >` (this group's leader/co-leader only). REMOVED: "Enviar relatório", "Relatórios semanais", "Relatórios".

```
REUNIÕES  [ Reuniões | Relatórios ]       (SingleChoiceSegmentedButtonRow / Picker .segmented)
 tab Reuniões:  row = date + chips "Presença x/y" / "Relatório enviado|pendente"; legacy report-only rows show only the Relatório chip
                "Nova reunião" FAB/button only when LifeGroupMeetingRules.canWrite
 tab Relatórios: THIS group's stats (year/month chips, "Frequência do grupo" summary, attendance chart, PDF export); no group picker,
                no church-wide cards, no distribution (LifeGroupAnalyticsPanel with isScopedToGroup)
Row tap -> Reunião screen (Presença per person + Relatório); a past report is read inside it (read-only when not editable)
```

- Entry from Formulários ("Relatório semanal" entry) and `paz://form/life-group-reports`: `LifeGroupMeetingRules.resolveEntry(role, myGroups, allGroups)` (shared): admin/pastor -> picker over every group; exactly one led group -> that group's Reuniões directly (replaces the entry in the back stack); several led groups -> picker; supervisor only -> picker over supervised groups, read-only (a single supervised group opens directly); otherwise an explanatory message. Android: `LifeGroupMeetingEntryScreen`/`ViewModel`, route `life_group_meeting_entry`; the form routes `form_detail/life-group-reports` and `form_steps/life-group-reports` host the same screen.
- Errors on the Reunião screen (`LifeGroupMeetingErrors.kind/message/isRetryable`): 404 + `group_not_found` (or the legacy message "Life group with ID N not found" while an old backend sends no code) -> "Grupo não encontrado..." (no retry); any other 404/501/502/503 (route not deployed, generic Nest "Cannot GET ...") -> "Recurso indisponível no servidor. Tente novamente mais tarde." (retry); 403 -> no permission (no retry); no HTTP answer -> offline message with retry. A past date WITHOUT a record is not an error: the backend answers 200 with a draft and the screen opens as a read-only empty state ("Não há reunião registrada nesta data.", plus the deadline banner when `can_edit=false`, never a roster pre-filled with "everybody present"; `LifeGroupMeeting.hasNoRecord`). History list failures use `LifeGroupMeetingErrors.messageForHttpStatus`.
- The app never "defaults" to an old date: the history only shows dates that have a saved attendance or a legacy report and "Nova reunião" proposes the latest regular day <= today. The 2026-09-08 "Grupo não encontrado" was a tapped history row hitting a missing route (failed backend deploy of release 84f1dd9e).
- iOS (same IA): `LifeGroupDetailView` rows Reuniões (gate `canViewGroupReports`), Membros, Estudo do Life, Elegibilidade; `LifeGroupMeetingHistoryView` hosts the segmented `Picker` [Reuniões | Relatórios] (`LifeGroupMeetingsTab`, state in `LifeGroupMeetingHistoryViewModel.selectedTab`); the Relatórios tab embeds `LifeGroupAnalyticsPanel` over a `LifeGroupAnalyticsViewModel` scoped to the group (no group picker, no overview/donut cards, no distribution request, `LifeGroupAnalyticsKt.summarizeAttendance` summary card, PDF export in the toolbar). Row chips: `LifeGroupMeetingRowChips` (presence chip only with a saved presence, so report-only legacy rows show only the Relatório chip). `LifeGroupMeetingEntryView`/`LifeGroupMeetingEntryViewModel` (seam `LifeGroupMeetingEntrySource`) run `resolveEntry`: one led group opens its Reuniões in place, otherwise a picker (supervisor-only rows say "Somente leitura"), nobody gets the explanatory message. Reunião screen: `loadErrorRetryable` (missing group / permission: "Voltar" only, no retry), `isEmptyReadOnly` (deadline banner + "Não há reunião registrada nesta data."), `showAttendanceRoster`, pills "Sem presença"/"Sem relatório" when read-only. Home: `LifeGroupsHomeSection` (one card, dividers, "MEUS GRUPOS"/"LIFE GROUP" from the shared strings).
- iOS backgrounds: the root cause was `.background(PazMeshBackground())` on a content view that is only as big as the compact `ErrorStateView`, leaving a small mesh region over the app-level mesh (`PazChurchApp`). Pattern: `.pazScreenBackground()` on the screen root (fills the proposed size, then the mesh behind it); state views add no background or glass card. Applied to every screen root that hosts a state view (Reunião meeting/history/entry, analytics, Formulários, group/ministry lists and details, Life study/tasks, Casa de Paz, Academy, member journey, deep link placeholders, Home, Reports, Profile, notifications).
- Backgrounds: every screen is `Box(fillMaxSize) { PazMeshBackground(); Scaffold(containerColor = Transparent) { content with ONLY the top inset } }`. Loading, error, empty and read-only states are CONTENT (no background, no card wrapping the state, `fillMaxSize()` so they centre in the whole screen); cards wrap items only. Embedded panels (`LifeGroupAnalyticsPanel`) have no Scaffold/background. Android already followed this on all Reunião screens; the double background was iOS (fixed, see above).
- Home: `LifeGroupsHomeSection` = one glass card; several groups -> "MEUS GRUPOS" header + one row per group separated by dividers (tasks folded under each row, tap opens the group, "Ver todos (N)" below the card, cap 3 unchanged); one group keeps the "LIFE GROUP" kicker and no header. Rules in shared `homeLifeGroupsLayout(groupCount)` and `HomeLifeGroupsSection` strings.
