# Spec: Phase 3 (shared + Android) combined "Reunião" screen

Branch: feat/life-group-meeting-screen, stacked on PR #96 (`feat/life-group-meetings-api`, head 123e5f0). Design: `.pipeline/design-attendance-report-merge.md` (section 5.5). iOS follows on the same branch (separate agent).

## API consumed (backend/src/life-group-meetings, no backend change)
- `GET /api/life-groups/:id/meetings/:date[?extra_meeting=true]` -> `{life_group_id, meeting_date, attendance|null, report|null, derived:{committed_members, committed_members_present}, can_edit, edit_deadline, report_blocked_reason}`; `attendance` = attendance response + `is_draft`, `is_extra`, `default_present` (true for drafts).
- `PUT /api/life-groups/:id/meetings/:date` body `{attendance?:{entries:[{user_id,present}]}, report?:{...12 input fields}, extra_meeting?:bool}`; returns the same view. Report-only PUT before attendance exists -> 409 `attendance_required`.
- Errors: 400 `extra_meeting_required|extra_meeting_on_regular_day|extra_meeting_not_applicable|extra_meeting_immutable`, 403 `edit_window_closed`, 409 `attendance_required|extra_meeting_limit_reached`, 422 `group_has_no_sector|sector_has_no_area`, 404.
- History (existing endpoints): `GET /life-groups/:id/attendance` and `GET /forms/life-group-reports?life_group_id=`.

## Decisions (user, relayed)
1. No fixed day / extra meetings: leader picks a date via "Nova reunião" (date picker, never future). Fixed-day group on another weekday: "Reunião extra" toggle (`extra_meeting`).
2. Q3 all present by default, explicit "Todos presentes" toggle. Q1/Q2: `committed_*` derived server side, read-only in UI. Q5: 14-day window from API (`can_edit`, `edit_deadline`), read-only state afterwards.
3. Drafts persisted locally keyed by (user, group, date), cleared at logout. Attendance saved first, report second; PUT idempotent.
4. Reminders, push copy and deep links untouched. `paz://presenca/{id}/{date}` keeps route `life_group_attendance_editor/{id}/{date}` which now renders the combined screen.
5. Phase 0 standalone report form is NOT in this branch's base (it lives on fix/life-group-report-submit); Formulários entry / `paz://form/life-group-reports` are left exactly as-is on this base. Documented and flagged.

## Scope
Shared (KMP): models, `LifeGroupMeetingRepository` (+Impl, error mapping), pure rules/draft/validation (commonMain, commonTest), `MeetingDraftStore` (expect/actual DataStore / NSUserDefaults) cleared on logout, Koin + IosAppContainer.
Android: package `ui/features/lifegroupmeeting` (screen, ViewModels, UiState), history list "Reuniões" + "Nova reunião" on group detail (replaces the Presença card), route `life_group_meeting/{lifeGroupId}/{date}` + aliasing of the old editor route, ViewModel tests, nav tests.

## Out of scope
iOS UI, backend, reminders, removing the legacy attendance endpoints, admin-ui.

## Acceptance
- Shared tests green (`:shared:iosSimulatorArm64Test`). Android compile/tests verified by CI only (SDK not installed locally): UNVERIFIED locally.
