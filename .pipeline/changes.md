# Changes: Reunioes UX (shared + Android + iOS)

Branch `feat/life-group-reunioes-ux` from develop c8f13d25. Client only; backend contract = PR #102.

## Shared (`kmp-mobile/shared`)
- `LifeGroupMeetingErrors`: `Kind` enum + `kind(error)`, `isRetryable`, `messageForHttpStatus`, constants `MESSAGE_*`, `CODE_GROUP_NOT_FOUND`. 404 = group not found only with `group_not_found` (or legacy "Life group with ID N not found"); other 404/501/502/503 = server unavailable.
- `LifeGroupMeetingRules.resolveEntry(role, myGroups, allGroups): LifeGroupMeetingEntry` (+ `LifeGroupMeetingEntryGroup`), `isLeadership(group)`.
- `LifeGroupMeeting.hasNoRecord`, `LifeGroupMeetingSummary.isReportOnly`.
- `summarizeAttendance()` / `LifeGroupAttendanceSummary` (single-group stats summary).
- `LifeGroupAnalyticsRepository.getOverview(lifeGroupId: Int? = null)` (sends `life_group_id`). Swift: default args are not exposed, pass `nil`/`KotlinInt`.
- `homeLifeGroupsLayout(groupCount)`, `HomeLifeGroupsSection`.
- `Throwable.anyHttpStatusCodeOrNull()` (also 5xx).
- Not removed yet (iOS still compiles against them): `LifeGroupReportDraft`, `LifeGroupReportRules`, `LifeGroupReportForm`, `FormsRepository.submitLifeGroupReport`. iOS agent: after deleting the iOS form (`Features/LifeGroupReports/LifeGroupReportForm*`, `LifeGroupReportFormTests`, pbxproj entries) delete these and their tests (`LifeGroupReportDraftTest`, `FormsRepositoryLifeGroupReportTest`).

## Android
- Reunioes screen: segmented [Reunioes | Relatorios] (`LifeGroupMeetingsTab`, VM `onTabSelected`); Relatorios tab embeds `LifeGroupAnalyticsPanel` scoped to the group (no group picker, no overview cards, no distribution, summary card, PDF export button in the panel).
- Reuniao screen: non-retryable load failures show "Voltar"; read-only date without a record = empty state (`isEmptyReadOnly`), roster hidden unless a presence is saved (`showAttendanceRoster`), pills "Sem presenca"/"Sem relatorio" when read-only.
- History rows: no "Presenca pendente" chip (report-only rows show only the Relatorio chip); errors via `messageForHttpStatus`.
- Entry flow: `LifeGroupMeetingEntryScreen/ViewModel`, route `life_group_meeting_entry`; `form_detail|form_steps/life-group-reports` host it; Formularios effect renamed `NavigateToLifeGroupMeetings`.
- Group detail rows: Reunioes, Membros (new on Android), Estudo do Life, Elegibilidade; removed Enviar relatorio / Relatorios semanais / Relatorios.
- Removed: package `ui/features/lifegroupreports/` (form, list, detail, VMs, tests), routes `LifeGroupReports`, `LifeGroupReportSubmit`, `LifeGroupReportDetail`, Koin entries.
- Home: `LifeGroupsHomeSection` (one card, "MEUS GRUPOS" header + dividers for several groups).
- Analytics VM: scoped mode skips overview and distribution requests.

## Double background: findings and pattern (for iOS)
Android already had a single background on every Reuniao screen: `Box(fillMaxSize){ PazMeshBackground(); Scaffold(containerColor=Transparent){ content padded by top inset only } }`; error/empty/loading states are plain content (`Box(fillMaxSize)`, no background); cards wrap items only. No Android change was needed beyond keeping new screens/panel on that pattern.
iOS cause (read from `LifeGroupMeetingView`): `content.background(PazMeshBackground())` sizes the mesh to the content; `ErrorStateView` is compact, so a small mesh region sits over the real (larger) screen background. Fix: make the root fill the screen first, then background: `content.frame(maxWidth: .infinity, maxHeight: .infinity).background(PazMeshBackground().ignoresSafeArea())` (or `ZStack { PazMeshBackground().ignoresSafeArea(); content }`); state views (error/empty) must not add their own background/glassCard. Audit History, Reports list/detail (being removed), Eligibility, and the new entry/picker with the same rule.

## Assumptions / defaults
See spec.md A1-A6. Extra: a supervisor with exactly one supervised group opens it directly; admin/pastor always get the picker; single-group stats hide church-wide cards (overview param exists but the scoped view does not call it).

## iOS (`kmp-mobile/ios/PazChurch`)
- Compile fix: `LifeGroupAnalyticsViewModel.loadOverview` calls `getOverview(lifeGroupId: nil)` (church-wide, feeds the unscoped group dropdown). Scoped mode (`isScopedToGroup`) skips overview and distribution (`loadInitial()`), exposes `attendanceSummary` (`LifeGroupAnalyticsKt.summarizeAttendance`).
- Errors: `LifeGroupMeetingErrorMapping` now also exposes `kind`, `isRetryable`, `historyMessage`. `LifeGroupMeetingViewModel.loadErrorRetryable`; missing group / no permission show "Voltar" instead of "Tentar novamente"; history and entry errors use the mapped copy.
- Read-only states: `isEmptyReadOnly` (deadline banner + "Não há reunião registrada nesta data."), `showAttendanceRoster`, pills "Sem presença"/"Sem relatório"; legacy report without presence renders "Sem presença registrada para esta data.".
- Double background: root cause `.background(PazMeshBackground())` sizing the mesh to compact content (`ErrorStateView`). New `View.pazScreenBackground()` (frame max + mesh); applied to the meeting/history/entry/analytics screens and every other screen root that can host a compact state view (list in `.ai/features/mobile-app.md`). State views add no background/card. Left unchanged on purpose: `SearchView` (backs a VStack that already fills), `AgendaDetailView` bottom bar, `VideoPlayerView` inner scroll, `PazChurchApp` app-level mesh.
- IA: group detail rows Reuniões (first), Membros, Estudo do Life, Elegibilidade; removed "Enviar relatório", "Relatórios semanais", "Relatórios". `LifeGroupMeetingHistoryView` = segmented [Reuniões | Relatórios] (`LifeGroupMeetingsTab`); Relatórios = `LifeGroupAnalyticsPanel` scoped to the group (no picker, no overview cards, no distribution). Row chips via `LifeGroupMeetingRowChips`.
- Entry: `LifeGroupMeetingEntryView`/`ViewModel` (shared `resolveEntry`), hosted by `FormDestinationView` for the `life-group-reports` form (Formulários list and `paz://form/life-group-reports` via `FormDetailDeepLinkView`).
- Home: `LifeGroupsHomeSection` (one glass card, dividers, "MEUS GRUPOS"/"LIFE GROUP" from shared `HomeLifeGroupsSection`, layout from `homeLifeGroupsLayout`), sibling NavigationLinks, cap 3 and "Ver todos (N)" unchanged.
- Removed (iOS): `Features/LifeGroupReports/` (LifeGroupReportFormView/ViewModel, LifeGroupReportsView/ViewModel, LifeGroupReportDetailView), tests `LifeGroupReportFormTests`, `LifeGroupReportsTests` (gate matrix kept in `LifeGroupReunioesUXTests`), pbxproj entries.
- Removed (shared, nothing else referenced them on either platform): `LifeGroupReportDraft.kt` (draft, rules, groups, validation), `LifeGroupReportForm` DTO, `FormsRepository.submitLifeGroupReport` (+impl, AuthRepositoryTest fake), `LifeGroupReportDraftTest`, `FormsRepositoryLifeGroupReportTest`. Backend `POST /forms/life-group-reports` untouched.
- Tests: `PazChurchTests/LifeGroupReunioesUXTests.swift` (error kinds, retry policy, no-record read-only, report-only, row chips, entry resolution, scoped analytics calls, home layout, tabs, gate matrix); `LifeGroupMeetingViewModelTests` updated for the 404 contract.
