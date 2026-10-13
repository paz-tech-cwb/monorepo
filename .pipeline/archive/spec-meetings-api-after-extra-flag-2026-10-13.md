# Spec: Meetings API (phase 1, backend only, additive)

Branch `feat/life-group-meetings-api` (from origin/develop @6d87aef). Source design: `.pipeline/design-attendance-report-merge.md` (phase 1) and `.pipeline/pilot-audit.md`.

## Request
One transactional endpoint pair that reads/writes a life group meeting (attendance + weekly report) keyed by (life group, date). Tables stay separate; old endpoints keep their contracts. No reminder, push copy or deep link changes.

## `.ai/` context read
`CLAUDE.md`, `.ai/README.md`, `features/life-groups.md`, `apps/backend.md`, `apps/postman-files.md`, `backend/CLAUDE.md`.

## Product decisions (recorded)
- Q1: "comprometidos" = the whole roster. `committed_members` = attendance `members_count` (roster snapshot), derived server-side, no manual input, no per-member flag.
- Q2: `committed_members_present` = attendance `present_count`; leader/co-leader count only if they are on the roster and marked present (same as any roster member).
- Q3: new attendance draft stays all-present. GET exposes `attendance.is_draft: true` and `attendance.default_present: true` so mobile can add an explicit "Todos presentes" toggle later.
- Q5: edit window = 14 days after the meeting date, ONE constant `LIFE_GROUP_MEETING_EDIT_WINDOW_DAYS = 14` (`common/constants/life-group-meeting.ts`), optionally overridden by env var of the same name (positive integer, else default). Leader, co-leader and in-scope supervisors (ScopeResolver, keyed off leader_id/co_leader_id rows) may create/edit both pieces within the window; admin always. Days are America/Sao_Paulo calendar days; day 14 allowed, day 15 denied. Reads are always allowed for anyone with access.
- Q4, Q6-Q12 open: nothing built that depends on them. Reminders, push copy, deep links, catalog untouched.

## Scope
1. Migration `1796000000000-AddAttendanceLinkToLifeGroupReports`: nullable `life_group_reports.attendance_id uuid` FK -> `life_group_attendance(id)` ON DELETE SET NULL (+ plain index), duplicate scan on `(life_group_id, date) WHERE deleted_at IS NULL` that never deletes anything: duplicates -> no index, RAISE NOTICE + console warning + rows recorded in new table `life_group_report_duplicate_findings`; clean -> `CREATE UNIQUE INDEX IF NOT EXISTS uq_life_group_reports_group_date_active`. Idempotent (every statement IF NOT EXISTS / guarded), `down()` drops index, FK, column, findings table. No TypeORM `@Index` decorator for the partial index (synchronize must not try to create it on dirty data); documented in the entity.
2. Entity `LifeGroupReport`: `attendanceId` + relation.
3. Module `life-group-meetings`: `GET|PUT /api/life-groups/:lifeGroupId/meetings/:date`, `AuthGuard('jwt')` + `ScopeGuard`, no `@Roles`, same access rule as attendance (shared `assertCanAccessLifeGroup`).
4. Shared logic extraction (no duplication): attendance upsert core -> `LifeGroupAttendanceService.upsertInTransaction`; report snapshot sync -> `LifeGroupReportSnapshotService` (hooked into the attendance upsert so the OLD attendance PUT keeps linked reports consistent); report mapper `toLifeGroupReportResponse`; audit service accepts an optional `manager` so audit rows join the transaction.
5. Duplicate guard in application code (index may be absent): transaction + `pg_advisory_xact_lock(ns, hashtext(group:date))`, then find-then-upsert; 23505 mapped to retry/409.
6. Tests, docs (`.ai/features/life-groups.md`, `.ai/apps/backend.md`), `.pipeline` records.

## Contract
`PUT` body `{ attendance?: {entries:[{user_id, present}]}, report?: {kids_0_to_11, guests, mdas, offering, committed_at_tadel, committed_at_culto, leader_attended[], disciples_count, disciples_discipled_this_week, pastoring_activity_type[], pastoring_activity_other?, training_activity_type[], training_activity_other?} }`, at least one. `report` is a full replace (all required fields every time). Client-sent `date/area_id/sector_id/life_group_id/committed_*` are NOT in the DTO: ignored (the global pipe strips non-`@Expose` keys, `excludeExtraneousValues`), values come from path/group/attendance.
Responses (GET and PUT): `{ life_group_id, meeting_date, attendance: {id|null, ..., entries, is_draft, default_present}, report: {...}|null, derived: {committed_members, committed_members_present}, can_edit, edit_deadline, report_blocked_reason }`.
Errors: 400 bad date/body/weekday mismatch/roster, 403 no access or edit window closed, 404 group, 409 `attendance_required` (report without attendance), 422 group has no sector/area (report only; attendance still saves).

## Decisions I had to take (flag)
- D1 Only `admin` bypasses the edit window; `pastor` has unrestricted access but is bound by the window.
- D2 Report requires sector+area on the group: 422, attendance part still allowed (never silently invent area/sector).
- D3 Groups without a fixed `meeting_day`: same as attendance today, any past date accepted (the `extra_meeting` flag is rejected there: nothing is "extra").
- D10 (Q7, user decision "extra meetings: yes") Extra meetings: groups WITH a fixed `meeting_day` may record a meeting on another weekday via an explicit `extra_meeting: true` on the meetings API only (new migration `1796000000001`, `life_group_attendance.is_extra`). Missing flag on a non-fixed weekday -> 400 `extra_meeting_required`; flag on the regular weekday/no-fixed-day group -> 400; flag immutable once saved (opposite value -> 400 `extra_meeting_immutable`, omitted keeps it); max 3 extras per group per ISO week (409 `extra_meeting_limit_reached`, advisory lock, admin bound too); extras count for analytics (with `extra_meetings_count`) and for task eligibility but only the earliest extra per ISO week counts there; reminders unaffected. Old attendance endpoints keep rejecting non-fixed weekdays (no flag, response shape unchanged). GET draft: `?extra_meeting=true`.
- D4 Attendance-only PUT on a date that has an UNLINKED legacy report leaves that report untouched (not linked, not re-synced); a PUT with `report` links it and overwrites its snapshot fields.
- D5 Multiple non-deleted reports for one (group,date) in a dirty DB: the oldest is the one updated; extra rows untouched (warn log).
- D6 Old `POST /forms/life-group-reports` duplicate (index present) now answers 409 instead of a DB 500; old `PATCH` unchanged (does not re-sync `committed_*` on linked rows; phase 0/4). The legacy attendance PUT re-syncs linked reports regardless of the 14-day window (see D1).
- D7 `edit_deadline` is `YYYY-MM-DD` (last editable day, inclusive, Sao Paulo), same for everyone; `can_edit` is per viewer.
- D8 Attendance entries capped at 500, report arrays at 20 items x 80 chars, `*_other` 180, counts 0..100000, offering `^\d{1,8}(\.\d{1,2})?$`.
- D9 "Future date" check reuses the attendance rule (UTC date), the edit window uses Sao Paulo days.

## Validation plan
build, scoped jest (new module, attendance, reports, analytics, tasks, forms-core), full jest vs develop baseline (worktree), scoped eslint, prettier --check, throwaway Postgres (migration clean / duplicates / re-run / down, real-DB concurrency + rollback).
